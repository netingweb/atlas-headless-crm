# Configurazioni Atlas CRM Headless

Questa directory contiene le configurazioni JSON-driven per ogni tenant.

## Struttura

```
config/
  {tenant_id}/
    tenant.json          # Configurazione generale del tenant
    units.json           # Elenco divisioni/unità
    entities.json        # Definizione entità e campi
    permissions.json     # Ruoli e ACL
    dictionary.json      # Dizionari di valori
    sharing_policy.json  # Regole di condivisione
    workflows.json       # Regole di automazione
    mcp.manifest.json    # Strumenti MCP per agenti AI
```

## Tenant Disponibili

### Tenant Demo

Il tenant `demo` è preconfigurato con un caso d'uso B2B generico:

- **Units**: sales, support
- **Entities**: contact, company, note, task, opportunity, product, document
- **Roles**: admin, sales_manager, sales_rep
- **Workflows**: followup_hot_lead
- **Use Case**: CRM generico per vendita B2B

### Tenant Demo2 (Automotive)

Il tenant `demo2` è un esempio completo per il settore automotive:

- **Units**: milano_sales, milano_service, roma_sales, roma_service, torino_sales, torino_service
- **Entities Global** (visibili da tutte le units): product (veicoli), contact, company
- **Entities Local** (specifiche per unit): task, note, deal, opportunity, document, service_order
- **Roles**: admin, organization_manager, unit_manager, sales_rep, service_rep, accounting
- **Workflows**: 7 workflows per processo vendita/service
- **Use Case**: Concessionaria auto multi-sede con vendita e service

**Documentazione Demo2**:

- [Setup Guide](../docs/demo2-setup-guide.md)
- [Verification Report](../docs/demo2-verification-report.md)
- [Final Summary](../docs/demo2-final-summary.md)

## Entità Global vs Local

A partire dalla versione 0.1.0, il sistema supporta due tipi di scope per le entità:

### Scope: Tenant (Global)

Entità **condivise** tra tutte le units del tenant:

- Collection MongoDB: `{tenant}_{entity}` (senza unit_id)
- Esempio: `demo2_product`, `demo2_contact`
- Visibilità: Tutti i record visibili da tutte le units
- Uso tipico: Cataloghi prodotti, anagrafica clienti condivisa

```json
{
  "name": "product",
  "scope": "tenant",
  "fields": [...]
}
```

### Scope: Unit (Local) - Default

Entità **specifiche** di ogni unit:

- Collection MongoDB: `{tenant}_{unit}_{entity}`
- Esempio: `demo2_milano_sales_task`, `demo2_roma_sales_task`
- Visibilità: Ogni unit vede solo i propri record
- Uso tipico: Tasks, deals, documenti specifici della unit

```json
{
  "name": "task",
  "scope": "unit",
  "fields": [...]
}
```

**Nota**: Se `scope` non è specificato, il default è `"unit"` per retrocompatibilità.

## Come modificare le configurazioni

1. Modifica i file JSON nella directory `config/{tenant_id}/`
2. **IMPORTANTE**: Esegui sempre lo script di sync per applicare le modifiche:
   ```bash
   pnpm config:sync demo
   # oppure
   pnpm config:sync demo2
   ```

## ⚠️ Sincronizzazione Obbligatoria

**Ogni volta che modifichi le configurazioni, devi eseguire la sincronizzazione!**

Le configurazioni vengono caricate da MongoDB all'avvio dell'applicazione. Le modifiche ai file JSON **non vengono applicate automaticamente** - devi sincronizzarle manualmente.

### Quando sincronizzare

Esegui `pnpm config:sync` dopo aver modificato:

- ✅ **entities.json** - Aggiunta/modifica/rimozione di entità o campi
- ✅ **tenant.json** - Modifiche alla configurazione del tenant
- ✅ **units.json** - Aggiunta/modifica di unità
- ✅ **permissions.json** - Modifiche a ruoli e permessi
- ✅ **dictionary.json** - Modifiche ai dizionari
- ✅ **sharing_policy.json** - Modifiche alle regole di condivisione
- ✅ **workflows.json** - Modifiche ai workflow
- ✅ **mcp.manifest.json** - Modifiche al manifest MCP

### Comando di sincronizzazione

```bash
# Sincronizza il tenant demo
pnpm config:sync demo

# Sincronizza il tenant demo2 (automotive)
pnpm config:sync demo2

# Oppure specifica un tenant diverso
pnpm config:sync <tenant_id>
```

### Cosa fa la sincronizzazione

Lo script `config:sync`:

1. Legge tutti i file JSON dalla directory `config/{tenant_id}/`
2. Sincronizza le configurazioni nel database MongoDB
3. Sostituisce completamente le configurazioni esistenti (upsert)
4. L'API ricaricherà le nuove configurazioni al prossimo accesso (o dopo aver pulito la cache)

### Pulizia cache API (opzionale)

Dopo la sincronizzazione, puoi pulire la cache dell'API per forzare il ricaricamento immediato:

```bash
# Via API (richiede autenticazione)
curl -X GET "http://localhost:3000/api/demo/config/clear-cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Oppure riavvia l'API per ricaricare le configurazioni.

## 🔐 Sicurezza delle Chiavi API

**IMPORTANTE**: I file `tenant.json` con chiavi API reali sono **esclusi** dal repository Git per sicurezza.

### Setup Sicuro

1. **Usa i file di esempio**: Copia `tenant.json.example` in `tenant.json`:

   ```bash
   cp config/demo/tenant.json.example config/demo/tenant.json
   ```

2. **Configura le variabili d'ambiente**: Crea un file `.env` nella root del progetto:

   ```bash
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Usa placeholder nei file JSON**: I file `tenant.json.example` usano placeholder come `${OPENAI_API_KEY}` che vengono sostituiti automaticamente durante il sync.

4. **Le variabili d'ambiente hanno priorità**: Anche se le chiavi sono nel file JSON, le variabili d'ambiente le sovrascrivono a runtime.

Per maggiori dettagli, consulta la [Guida alla Sicurezza delle Chiavi API](../docs/guides/api-keys-security.md).

## Versionamento

I file JSON sono versionati in Git, permettendo di tracciare le modifiche alle configurazioni nel tempo.

**Nota**: Solo i file `*.example` sono committati. I file `tenant.json` con chiavi reali sono esclusi da Git.
