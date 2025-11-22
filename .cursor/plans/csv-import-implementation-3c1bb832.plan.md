<!-- 3c1bb832-c20c-4366-a3b8-0794533de847 ff064e92-f160-4d2d-9c52-b42b4b7dd21f -->

# Implementazione Sistema Import CSV

## Panoramica

Sistema completo per importare dati CSV nelle entities del CRM con wizard multi-step, validazione avanzata, gestione di enum e relazioni, e report dettagliato.

## Architettura

### Backend (NestJS)

- **Controller**: `apps/api/src/imports/imports.controller.ts`
- `POST /:tenant/:unit/:entity/import/analyze` - Analizza CSV e suggerisce formato
- `POST /:tenant/:unit/:entity/import/preview` - Preview con mapping proposto
- `POST /:tenant/:unit/:entity/import/test` - Test validazione su campione
- `POST /:tenant/:unit/:entity/import/execute` - Esegue import con progress tracking
- `GET /:tenant/:unit/:entity/import/:importId/status` - Stato avanzamento

- **Service**: `apps/api/src/imports/imports.service.ts`
- Parsing CSV con rilevamento automatico separatore/encoding
- Mapping automatico campi CSV → entity fields
- Validazione con sistema esistente (`EntitiesService`)
- Gestione enum con mapping intelligente
- Lookup relazioni (ID o campo univoco)
- Casting/trasformazione valori
- Progress tracking per import lunghi

- **DTO**: `apps/api/src/imports/imports.dto.ts`
- `AnalyzeCsvDto`, `FieldMappingDto`, `ImportConfigDto`, `ImportStatusDto`

- **Module**: `apps/api/src/imports/imports.module.ts`

### Frontend (React/TypeScript)

- **Pagina**: `apps/playground/src/pages/EntityImport.tsx`
- Wizard multi-step (Upload → Mapping → Test → Execute → Report)
- Step 1: Upload CSV con preview
- Step 2: Mapping interattivo con suggerimenti automatici
- Step 3: Test validazione su campione
- Step 4: Esecuzione con progress bar
- Step 5: Report risultati

- **Componenti**:
- `apps/playground/src/components/import/CsvUploadStep.tsx`
- `apps/playground/src/components/import/FieldMappingStep.tsx`
- `apps/playground/src/components/import/ImportTestStep.tsx`
- `apps/playground/src/components/import/ImportProgressStep.tsx`
- `apps/playground/src/components/import/ImportReportStep.tsx`

- **API Client**: `apps/playground/src/lib/api/imports.ts`

- **Modifica EntityList**: Aggiungere bottone "Import" accanto a export

## Funzionalità Chiave

### 1. Rilevamento Automatico Formato CSV

- Analisi separatori (`,`, `;`, `\t`, `|`)
- Rilevamento encoding (UTF-8, ISO-8859-1, Windows-1252)
- Rilevamento header row
- Gestione quote/escape characters

### 2. Mapping Automatico Campi

- Match per nome esatto
- Match fuzzy (similarità stringhe)
- Match case-insensitive
- Suggerimenti basati su tipo campo

### 3. Gestione Enum

- Validazione valori enum
- Mapping automatico con fuzzy matching (es. "Nuovo" → "new")
- Opzione rifiuto riga o mapping manuale
- Preview valori non validi prima dell'import

### 4. Gestione Campi Relazionati (Reference)

- Supporto ID MongoDB/ObjectId diretto
- Lookup tramite campo univoco (email, codice, etc.)
- Validazione esistenza entità referenziata
- Gestione multiple references (array)

### 5. Casting e Trasformazione

- Cast automatico per tipo campo (string → number, date parsing)
- Trasformazioni custom configurabili
- Gestione valori null/empty
- Sanitizzazione input (prevenzione injection)

### 6. Test Pre-Load

- Validazione campione righe (configurabile, default 10)
- Report errori per riga
- Preview dati trasformati
- Statistiche (validi/invalidi)

### 7. Import con Progress Tracking

- Processo sincrono con streaming progress
- Progress bar aggiornata in tempo reale
- Gestione errori per riga (skip o stop)
- Batch processing per performance

### 8. Report Finale

- Statistiche complete (totali, successi, errori)
- Dettaglio errori per riga
- Export log errori
- Link alle entità create

## Sicurezza

- Validazione input con schema esistente
- Sanitizzazione valori stringa
- Prevenzione SQL injection (MongoDB è NoSQL, ma sanitizzazione comunque)
- Limitazione dimensione file CSV
- Rate limiting su endpoint import
- Autorizzazione con scope `crm:write`

## File da Creare/Modificare

### Backend

- `apps/api/src/imports/imports.module.ts` (nuovo)
- `apps/api/src/imports/imports.controller.ts` (nuovo)
- `apps/api/src/imports/imports.service.ts` (nuovo)
- `apps/api/src/imports/imports.dto.ts` (nuovo)
- `apps/api/src/app.module.ts` (modifica - aggiungere ImportsModule)

### Frontend

- `apps/playground/src/pages/EntityImport.tsx` (nuovo)
- `apps/playground/src/components/import/CsvUploadStep.tsx` (nuovo)
- `apps/playground/src/components/import/FieldMappingStep.tsx` (nuovo)
- `apps/playground/src/components/import/ImportTestStep.tsx` (nuovo)
- `apps/playground/src/components/import/ImportProgressStep.tsx` (nuovo)
- `apps/playground/src/components/import/ImportReportStep.tsx` (nuovo)
- `apps/playground/src/lib/api/imports.ts` (nuovo)
- `apps/playground/src/pages/EntityList.tsx` (modifica - aggiungere bottone Import)
- `apps/playground/src/App.tsx` o router (modifica - aggiungere route)

## Dipendenze

### Backend

- `papaparse` o `csv-parse` per parsing CSV
- `iconv-lite` per gestione encoding
- `string-similarity` per fuzzy matching

### Frontend

- `papaparse` per parsing CSV lato client
- `react-dropzone` per drag & drop upload
- Componenti UI esistenti (Button, Card, Progress, etc.)

## Note Implementative

- Riutilizzare `EntitiesService.create()` per creazione entità
- Riutilizzare `RelationsService.validateReferences()` per validazione relazioni
- Riutilizzare sistema validazione esistente (`ValidatorCache`)
- Progress tracking tramite EventEmitter o callback
- Gestione errori granulare (per riga) con rollback opzionale

### To-dos

- [ ] Creare modulo imports con controller, service e DTO per gestione import CSV
- [ ] Implementare parser CSV con rilevamento automatico separatore, encoding e header
- [ ] Implementare sistema di mapping automatico campi CSV → entity fields con fuzzy matching
- [ ] Implementare gestione enum con mapping automatico e validazione
- [ ] Implementare lookup relazioni tramite ID o campo univoco
- [ ] Implementare endpoint test validazione su campione righe
- [ ] Implementare esecuzione import con progress tracking e gestione errori
- [ ] Creare API client per chiamate import nel frontend
- [ ] Creare pagina EntityImport con wizard multi-step
- [ ] Implementare step upload CSV con preview e rilevamento formato
- [ ] Implementare step mapping interattivo con suggerimenti automatici
- [ ] Implementare step test validazione con preview risultati
- [ ] Implementare step esecuzione con progress bar e aggiornamento real-time
- [ ] Implementare step report finale con statistiche e dettaglio errori
- [ ] Aggiungere bottone Import nella pagina EntityList accanto a Export
- [ ] Implementare sanitizzazione input e validazione sicurezza
