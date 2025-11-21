<!-- 6fa95256-5024-4453-9721-b5ba6eaabdee 7098a8a9-0737-4054-b817-eb48f80ac0f2 -->

# Implementazione supporto valori multipli per campi enum e reference

## Obiettivo

Permettere ai campi enum e reference di accettare array di valori quando `multiple: true` è definito nello schema dell'entità, con supporto completo in validazione, API, MCP tools, relazioni, ricerca e UI. Poiché siamo ancora in fase di sviluppo, non servono fallback retrocompatibili: i nuovi campi multiple richiederanno direttamente array. I seeder di demo2 verranno aggiornati per rigenerare dati coerenti con il nuovo schema.

## File da modificare

### 1. Schema Type Definition

**File**: `packages/types/src/entities.ts`

- Aggiungere `multiple: z.boolean().default(false).optional()` al `FieldDefinitionSchema`
- Consente di marcare campi enum/reference come multipli

### 2. Validazione Core

**File**: `packages/core/src/validation.ts`

- Aggiornare `fieldToJsonSchema()` per:
- Inferire `schema.type = 'array'` con `items` adeguati quando `multiple: true`
- Gestire `enum` dentro `items` per campi enum multipli
- Gestire `items.type = 'string'` per reference multipli
- Non servono fallback: i campi multiple accettano solo array

### 3. API Service - JSON Schema Generation

**File**: `apps/api/src/entities/entities.service.ts`

- Allineare `fieldToJsonSchema()` al comportamento della validazione core (array vs single)
- Garantire che i JSON schema usati dalle API riflettano `multiple`

### 4. API Service - Relations Service

**File**: `apps/api/src/entities/relations.service.ts`

- `validateReferences()`: iterare array di ID quando `multiple: true`
- `populateReferences()`: restituire array di entità popolate per i campi multipli
- `getRelatedEntities()`: usare `$in` quando il campo reference contiene array

### 5. API Service - MCP Tools Schema

**File**: `apps/api/src/mcp/mcp.service.ts`

- `buildEntityProperties()`: generare schema Radix/MCP con `type: 'array'` e `items`
- `validateToolArgs()`: verificare che i campi multipli ricevano array, validare elementi

### 6. MCP Server

**File**: `apps/mcp-server/src/main.ts`

- Replicare la logica del punto 5 per la generazione degli schemi lato MCP server

### 7. Indicizzazione Typesense

**File**: `packages/search/src/typesense-client.ts`

- `buildTypesenseSchema()` e `mapFieldTypeToTypesense()`: mappare i campi multipli a tipi array (`string[]`, ecc.)
- Assicurarsi che `upsertDocument()` continui a funzionare (Typesense gestisce array nativamente)

### 7b. Query Builder per filtri array

**File**: `packages/search/src/query-builder.ts`

- Supportare filtri per campi multipli usando la sintassi Typesense (`field:=[a,b]`)

### 8a. Componente UI MultiSelect

**File**: `apps/playground/src/components/ui/multi-select.tsx` (nuovo)

- Implementare un `MultiSelect` basato su Radix Popover + Command con checkbox
- API: `value: string[]`, `onValueChange(values: string[])`, `options`, `placeholder`, `disabled`

### 8b. UI Playground - Entity Detail

**File**: `apps/playground/src/pages/EntityDetail.tsx`

- Integrare `MultiSelect` per campi enum/reference con `multiple: true`
- Gestire form state come array, sia per edit che create
- Aggiornare `ReferenceField` per distinguere single vs multiple

### 9. Entity Visibility Settings

**File**: `apps/playground/src/components/settings/EntityVisibilityTab.tsx`

- Assicurarsi che i nuovi campi multipli siano mostrati correttamente (valori enum elencati, indicazione reference multiplo)

### 10. Documentazione e Swagger

**File**: `docs/guides/data-model.md` (e altra doc rilevante)

- Aggiornare la documentazione funzionale per spiegare l'uso di `multiple`, esempi di schema e note su enum/reference multipli

**File**: `apps/api/src/main.ts` (o file Swagger dedicato, es. `apps/api/src/swagger.ts`)

- Assicurarsi che la generazione Swagger includa il nuovo campo `multiple` nelle definizioni delle entità e che i component schema riflettano array vs single

### 11. Seeder Demo2

**File**: `scripts/fix-demo2-data.ts` (e file correlati)

- Rigenerare i dati demo2 con valori coerenti ai nuovi campi multipli
- Documentare il comando per rigenerare e sincronizzare (`pnpm tsx scripts/fix-demo2-data.ts demo2` + `pnpm config:sync demo2`)

## Note implementative

- Nessun fallback legacy: chi usa `multiple` deve fornire array subito
- Dopo aver aggiornato lo schema, rigenerare i dati di test (demo2) per evitare inconsistenze
- MongoDB e Typesense supportano array nativamente; basta allineare i mapper

## Testing e verifiche di qualità

- Creazione/aggiornamento di entità demo con campi enum/reference multipli
- Validazione API e workflow MCP per i nuovi campi
- Ricerca Typesense e filtri basati su campi multipli
- UI: form Entity Detail, visibilità campi, interazione MultiSelect
- Seeder demo2 rigenerati e sincronizzati con Mongo/Typesense
- Eseguire `pnpm lint`, `pnpm build` e `pnpm lint --fix`/`pnpm run precommit` (o equivalente configurato) dopo modifiche significative per intercettare errori
- Prima del push finale, rieseguire lint/build e i pre-commit hook per garantire il rispetto delle regole del repo

### To-dos

- [ ] Aggiornare schema FieldDefinition (multiple)
- [ ] Adeguare validazione core per array
- [ ] Aggiornare EntitiesService JSON schema
- [ ] Aggiornare RelationsService per reference multipli
- [ ] Aggiornare MCP service e server per array
- [ ] Adeguare Typesense schema/query per array
- [ ] Implementare componente UI MultiSelect
- [ ] Integrare MultiSelect in EntityDetail/ReferenceField
- [ ] Verificare EntityVisibilityTab per campi multipli
- [ ] Aggiornare seeder demo2 per nuovi campi
