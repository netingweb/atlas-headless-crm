# Analisi Scope delle Entità: Globali vs Locali

## Stato Attuale

Attualmente **tutte le entità sono trattate come locali alle unit**:

- Collection name: `{tenant_id}_{unit_id}_{entity}`
- Query filtrano sempre per `tenant_id` e `unit_id`
- Ogni documento ha `tenant_id` e `unit_id` obbligatori

## Problema

Alcune entità dovrebbero essere **globali al tenant** (condivise tra tutte le unit), mentre altre dovrebbero rimanere **locali alle unit**.

### Esempio Demo2 (Automotive)

**Entità Globali (condivise tra unit):**

- `product` - I veicoli sono condivisi tra tutte le sedi (Milano, Roma, Torino)
- `company` - Le aziende clienti sono condivise tra tutte le unit
- `contact` - I contatti potrebbero essere globali (un cliente può comprare da qualsiasi sede)

**Entità Locali (specifiche per unit):**

- `deal` - Le trattative sono specifiche per unit (Milano Sales gestisce le sue vendite)
- `service_order` - Gli ordini di servizio sono specifici per unit
- `task` - I task sono specifici per unit
- `document` - I documenti sono associati a entità locali
- `opportunity` - Le opportunità sono specifiche per unit
- `note` - Le note sono specifiche per unit

## Soluzione Proposta

### 1. Aggiungere campo `scope` alla definizione dell'entità

```json
{
  "name": "product",
  "scope": "tenant",  // "tenant" = globale, "unit" = locale (default)
  "fields": [...]
}
```

### 2. Modifiche al Repository

- **Collection name**:
  - Globali: `{tenant_id}_{entity}`
  - Locali: `{tenant_id}_{unit_id}_{entity}` (attuale)

- **Query filtering**:
  - Globali: solo `tenant_id`
  - Locali: `tenant_id` e `unit_id` (attuale)

- **Document creation**:
  - Globali: solo `tenant_id` (no `unit_id`)
  - Locali: `tenant_id` e `unit_id` (attuale)

### 3. Modifiche allo Schema TypeScript

Aggiungere `scope?: 'tenant' | 'unit'` a `EntityDefinitionSchema` (default: `'unit'`)

### 4. Modifiche alle Ricerche

- Typesense: collection name diverso per entità globali
- Qdrant: collection name già senza unit_id, ma filtri diversi

## Implementazione

1. ✅ Aggiornare schema TypeScript
2. ✅ Modificare `collectionName` helper per supportare scope
3. ✅ Modificare `EntityRepository` per gestire entità globali
4. ✅ Modificare `EntitiesService` per gestire entità globali
5. ✅ Modificare ricerche (Typesense/Qdrant) per entità globali
6. ✅ Aggiornare configurazioni demo2 con scope corretto
7. ✅ Migrazione dati esistenti (se necessario)

## Configurazione Demo2

```json
{
  "entities": [
    {
      "name": "product",
      "scope": "tenant",  // GLOBALE
      "fields": [...]
    },
    {
      "name": "company",
      "scope": "tenant",  // GLOBALE
      "fields": [...]
    },
    {
      "name": "contact",
      "scope": "tenant",  // GLOBALE (opzionale, può essere anche "unit")
      "fields": [...]
    },
    {
      "name": "deal",
      "scope": "unit",  // LOCALE (default)
      "fields": [...]
    },
    // ... altre entità locali
  ]
}
```
