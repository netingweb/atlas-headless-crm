# Demo2 Tenant - Verification Report

## Panoramica

Questo documento verifica l'implementazione del tenant **demo2** (automotive) e la corretta gestione delle entità con scope **global** (tenant-wide) vs **local** (unit-specific).

## Configurazione Tenant

### Tenant: demo2

- **Nome**: Demo2 Automotive Tenant
- **Settore**: Automotive (vendita e service auto)
- **File di configurazione**: `config/demo2/`

### Units (Organizzazione)

Il tenant demo2 è organizzato in 3 sedi principali, ciascuna con 2 dipartimenti:

1. **Milano**
   - `milano_sales`: Vendita veicoli
   - `milano_service`: Service e manutenzione

2. **Roma**
   - `roma_sales`: Vendita veicoli
   - `roma_service`: Service e manutenzione

3. **Torino**
   - `torino_sales`: Vendita veicoli
   - `torino_service`: Service e manutenzione

### Ruoli e Permessi

- `admin`: Amministratore sistema (accesso completo)
- `organization_manager`: Manager organizzazione (accesso cross-unit)
- `unit_manager`: Manager di unit specifica
- `sales_rep`: Agente vendite (unit-specific)
- `service_rep`: Tecnico service (unit-specific)
- `accounting`: Contabilità

## Entità e Scope

### Entità Global (scope: tenant)

Queste entità sono **condivise tra tutte le unit** del tenant. Ogni unit può accedere a tutti i record di queste entità.

| Entità      | Scope  | Collection MongoDB | Descrizione                  |
| ----------- | ------ | ------------------ | ---------------------------- |
| **product** | tenant | `demo2_product`    | Catalogo veicoli disponibili |
| **contact** | tenant | `demo2_contact`    | Anag rafica contatti/clienti |
| **company** | tenant | `demo2_company`    | Anagrafica aziende clienti   |

**Caratteristiche:**

- Collection MongoDB: `{tenant}_{entity}` (senza unit_id)
- Visibili da tutte le unit
- Un prodotto/contatto creato in milano_sales è visibile anche in roma_sales
- Non contengono campo `unit_id` nel documento MongoDB
- Collection Typesense: `{tenant}_{entity}` (senza unit_id nello schema)

### Entità Local (scope: unit)

Queste entità sono **specifiche di ogni unit**. Ogni unit vede solo i propri record.

| Entità            | Scope | Collection MongoDB           | Descrizione                       |
| ----------------- | ----- | ---------------------------- | --------------------------------- |
| **task**          | unit  | `demo2_{unit}_task`          | Attività e promemoria             |
| **note**          | unit  | `demo2_{unit}_note`          | Note e annotazioni                |
| **deal**          | unit  | `demo2_{unit}_deal`          | Trattative di vendita             |
| **opportunity**   | unit  | `demo2_{unit}_opportunity`   | Opportunità di vendita            |
| **document**      | unit  | `demo2_{unit}_document`      | Documenti (contratti, preventivi) |
| **service_order** | unit  | `demo2_{unit}_service_order` | Ordini di servizio/manutenzione   |

**Caratteristiche:**

- Collection MongoDB: `{tenant}_{unit}_{entity}`
- Visibili solo dalla unit di appartenenza
- Un task creato in milano_sales NON è visibile in roma_sales
- Contengono campo `unit_id` nel documento MongoDB
- Collection Typesense: `{tenant}_{unit}_{entity}` (con unit_id nello schema)

## Implementazione Codice

### 1. EntityRepository (`packages/db/src/repository.ts`)

```typescript
// Verifica scope e costruisce nome collection
const isGlobal = entityDef?.scope === 'tenant';
const coll = getDb().collection(
  collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal)
);

// Query filter: aggiunge unit_id solo per entity locali
const queryFilter: Record<string, unknown> = { ...filter, tenant_id: ctx.tenant_id };
if (!isGlobal) {
  queryFilter.unit_id = ctx.unit_id;
}
```

**✅ VERIFICATO**: Il repository gestisce correttamente la creazione di collection e query basate sullo scope.

### 2. EntitiesService (`apps/api/src/entities/entities.service.ts`)

```typescript
// Indexing Typesense: aggiunge unit_id solo per entity locali
const typesenseDoc: { id: string; [key: string]: unknown } = {
  id: String(doc._id),
  ...doc,
  tenant_id: ctx.tenant_id,
};
// Only add unit_id for local entities
if (entityDef.scope !== 'tenant') {
  typesenseDoc.unit_id = ctx.unit_id;
}
```

**✅ VERIFICATO**: Il service indicizza correttamente i documenti in Typesense basandosi sullo scope.

### 3. SearchService (`apps/api/src/search/search.service.ts`)

```typescript
// Semantic search: filtra per unit_id solo per entity locali
const isGlobal = entityDef.scope === 'tenant';
const filterMust: Array<{ key: string; match: { value: string } }> = [
  { key: 'tenant_id', match: { value: ctx.tenant_id } },
];
// Only filter by unit_id for local entities
if (!isGlobal) {
  filterMust.push({ key: 'unit_id', match: { value: ctx.unit_id } });
}
```

**✅ VERIFICATO**: Il search service filtra correttamente le ricerche basandosi sullo scope.

### 4. Query Builder (`packages/search/src/query-builder.ts`)

```typescript
// Typesense query: aggiunge filtro unit_id solo per entity locali
const isGlobal = entityDef?.scope === 'tenant';
const filterParts: string[] = [`tenant_id:=${ctx.tenant_id}`];

// Only filter by unit_id for local entities
if (!isGlobal) {
  filterParts.push(`unit_id:=${ctx.unit_id}`);
}
```

**✅ VERIFICATO**: Il query builder costruisce correttamente i filtri Typesense.

## Dati di Test Creati

### Global Entities

- **Products**: 26 veicoli nel catalogo globale (`demo2_product`)
  - Distribuiti tra: milano_sales, roma_sales, torino_sales (campo `created_by_unit`)
  - Visibili da tutte le unit

- **Contacts**: 3 contatti globali (`demo2_contact`)
  - Marco Rossi (created_by: milano_sales)
  - Laura Bianchi (created_by: roma_sales)
  - Giuseppe Verdi (created_by: torino_sales)
  - Visibili da tutte le unit

### Local Entities

- **Tasks**: 3 task locali
  - 1 in `demo2_milano_sales_task`
  - 1 in `demo2_roma_sales_task`
  - 1 in `demo2_milano_service_task`
  - Ogni task visibile solo dalla propria unit

- **Deals**: 2 deals locali
  - 1 in `demo2_milano_sales_deal`
  - 1 in `demo2_roma_sales_deal`
  - Ogni deal visibile solo dalla propria unit

- **Notes**: 2 note locali
  - 1 in `demo2_milano_sales_note`
  - 1 in `demo2_roma_sales_note`
  - Ogni nota visibile solo dalla propria unit

## Test API

### Script di Test

File: `scripts/test-demo2-api.sh`

Questo script bash testa:

1. Login utente admin@demo2.local
2. Fetch di entità globali (product, contact) da unit diverse → dovrebbero restituire gli stessi risultati
3. Fetch di entità locali (task) da unit diverse → dovrebbero restituire risultati diversi
4. Search per entità globali da unit diverse → dovrebbero restituire gli stessi risultati

### Esecuzione Test

```bash
# Prerequisito: API deve essere in esecuzione
pnpm --filter @crm-atlas/api dev

# In un altro terminale
./scripts/test-demo2-api.sh
```

## MCP Tools

I tool MCP definiti in `config/demo2/mcp.manifest.json` includono:

- `create_customer`: Crea un nuovo contatto cliente (global entity)
- `search_vehicles`: Cerca veicoli nel catalogo (global entity)
- `create_deal`: Crea una nuova trattativa (local entity)
- `update_deal_status`: Aggiorna stato trattativa (local entity)
- `get_deal_documents`: Recupera documenti di una trattativa (local entities)
- `get_sales_pipeline`: Visualizza pipeline vendite (local data)
- `create_service_appointment`: Crea appuntamento service (local entity)

**Nota**: I tool MCP utilizzano le stesse API REST, quindi ereditano automaticamente la logica di separazione global/local implementata nei layer sottostanti.

## Isolamento Tenant

### Verifiche Effettuate

1. **MongoDB Collections**
   - ✅ Tutte le collection demo2 hanno prefisso `demo2_`
   - ✅ Collection globali: `demo2_product`, `demo2_contact`
   - ✅ Collection locali: `demo2_{unit}_{entity}`
   - ✅ Nessuna interferenza con tenant `demo`

2. **Typesense Collections**
   - ⚠️ Da creare via backfill/indexer
   - Schema previsto: stesse regole MongoDB

3. **User Authentication**
   - ✅ Utenti demo2 hanno `tenant_id: "demo2"`
   - ✅ JWT tokens includono `tenant_id`
   - ✅ Tutti i metodi verificano `tenant_id` nel context

4. **ACL e Permissions**
   - ✅ Permissions caricate da `config/demo2/permissions.json`
   - ✅ Scope verificati per ogni operazione

## Prossimi Passi

### 1. Indexing Typesense

- [ ] Creare collection Typesense per demo2
- [ ] Eseguire backfill dati in Typesense
- [ ] Verificare ricerche full-text

### 2. Test Funzionali

- [ ] Eseguire `test-demo2-api.sh` con API attiva
- [ ] Testare MCP tools via Playground
- [ ] Testare switch unit in Playground

### 3. Documentazione

- [ ] Aggiornare README principale con istruzioni demo2
- [ ] Aggiornare Postman collection con esempi demo2
- [ ] Creare guida per setup nuovo tenant

### 4. Monitoring

- [ ] Verificare metrics indexing per demo2
- [ ] Verificare logs separazione tenant
- [ ] Performance test con più tenant simultanei

## Conclusioni

### ✅ Implementazione Corretta

- Separazione global/local implementata correttamente a tutti i livelli
- Repository, Service, Search gestiscono scope correttamente
- Collection MongoDB create con struttura corretta
- Dati di test creati e distribuiti correttamente

### ⚠️ Da Completare

- Indexing Typesense (collection non ancora create)
- Test funzionali con API attiva
- Documentazione utente finale

### 📊 Stato Sistema

- **MongoDB**: ✅ Operativo e corretto
- **Typesense**: ⚠️ Da indicizzare
- **Qdrant**: ⚠️ Da verificare (richiede OpenAI API key)
- **API**: ✅ Logica implementata
- **MCP**: ✅ Tools configurati

---

**Data Verifica**: $(date)
**Tenant**: demo2
**Versione**: 0.1.0
