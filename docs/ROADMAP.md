# CRM Atlas - Roadmap e Prossimi Step

## ✅ Completato (Fase 1)

- [x] Struttura monorepo con PNPM workspaces
- [x] API base con NestJS e Fastify
- [x] Autenticazione JWT e API Key
- [x] CRUD generico per entità
- [x] Validazione con AJV e messaggi di errore migliorati
- [x] Struttura dati relazionale (contacts, companies, notes, tasks, opportunities)
- [x] Dictionary per valori predefiniti
- [x] Ricerca full-text con Typesense
- [x] Ricerca semantica con Qdrant (base)
- [x] Exception handling globale
- [x] Health checks
- [x] Seed script e sync configurazione
- [x] Collection Postman completa
- [x] Docker Compose setup
- [x] Swagger/OpenAPI completo con DTO e documentazione

## 🚀 Prossimi Step Prioritari

### Fase 2: Completamento API e Documentazione (Priorità Alta)

#### 1. **Abilitare Swagger/OpenAPI** ⚡ Quick Win ✅ COMPLETATO

- [x] Riabilitare Swagger in `main.ts`
- [x] Aggiungere decoratori `@ApiProperty` ai DTO
- [x] Configurare autenticazione Bearer in Swagger
- [x] Pubblicare OpenAPI spec su `/docs-json`
- [x] Aggiungere esempi di richiesta/risposta

**Stima**: 2-3 ore ✅ Completato  
**Beneficio**: Documentazione API interattiva immediata

#### 2. **Migliorare Ricerca Semantica** ✅ COMPLETATO

- [x] Implementare indexing automatico dei campi `embeddable`
- [x] Aggiungere endpoint per ricerche ibride (full-text + semantica)
- [x] Implementare ranking e scoring combinato
- [ ] Aggiungere filtri avanzati nella ricerca (opzionale)

**Stima**: 4-6 ore ✅ Completato  
**Beneficio**: Ricerca più potente e utile

#### 3. **Gestione Relazioni** ✅ COMPLETATO

- [x] Endpoint per ottenere entità correlate (es. `/company/{id}/contacts`)
- [x] Validazione esistenza entità referenziate
- [ ] Cascade delete opzionale (opzionale per futuro)
- [x] Populate automatico nelle query (`?populate=true`)

**Stima**: 3-4 ore ✅ Completato  
**Beneficio**: API più completa per dati relazionali

### Fase 3: Indexer e Sincronizzazione (Priorità Media-Alta)

#### 4. **Indexer con MongoDB Change Streams** ✅ COMPLETATO

- [x] Creare app `apps/indexer/`
- [x] Implementare listener MongoDB Change Streams
- [x] Sincronizzazione automatica MongoDB → Typesense
- [x] Sincronizzazione automatica MongoDB → Qdrant (per campi embeddable)
- [x] Script di backfill per dati esistenti
- [x] Gestione errori e retry logic
- [x] Monitoring e logging

**Stima**: 8-12 ore ✅ Completato  
**Beneficio**: Ricerca sempre aggiornata senza intervento manuale

**Tecnologie**:

- MongoDB Change Streams
- BullMQ per job queue (opzionale)
- Worker pattern

### Fase 4: Workflow Engine (Priorità Media)

#### 5. **Workflow Engine con BullMQ** ✅ COMPLETATO

- [x] Creare app `apps/workflow/`
- [x] Integrazione BullMQ con Redis
- [x] Parser workflow da JSON config
- [x] Trigger system (event-based, scheduled, manual)
- [x] Action types base:
  - `update`: Aggiorna entità
  - `create`: Crea nuova entità
  - `notify`: Invia notifica (email/webhook)
  - `assign`: Assegna a utente/unit
  - `webhook`: Chiama webhook esterno
- [x] Condition evaluation engine
- [ ] Workflow execution history (opzionale per futuro)
- [ ] API per trigger manuali (opzionale per futuro)

**Stima**: 12-16 ore ✅ Completato  
**Beneficio**: Automazione CRM potente

**Tecnologie**:

- BullMQ
- Redis
- JSON Schema per validazione workflow

### Fase 5: MCP Server (Priorità Media)

#### 6. **MCP Server e Generator** ✅ COMPLETATO

- [x] Creare app `apps/mcp-server/`
- [x] Implementare MCP protocol
- [x] Tools per query CRM (create, get, search per tutte le entità)
- [x] Generator per manifest da configurazione tenant
- [x] Documentazione MCP

**Stima**: 8-10 ore ✅ Completato  
**Beneficio**: Integrazione con AI assistants (Claude, GPT)

### Fase 6: Testing e Qualità (Priorità Alta)

#### 7. **Test Completi** 🔄 IN CORSO

- [x] Unit test per packages principali (core, auth, utils, config)
- [x] Integration test per API endpoints (health, entities, auth)
- [ ] E2E test per flussi completi
- [x] Test per relazioni tra entità
- [ ] Test per workflow engine (quando implementato)
- [ ] Test per indexer (quando implementato)
- [ ] Coverage > 80% (attualmente ~30-40%)

**Stima**: 10-15 ore 🔄 Parzialmente completato  
**Beneficio**: Stabilità e qualità del codice

#### 8. **CI/CD con GitHub Actions** ✅ COMPLETATO

- [x] Workflow per lint, typecheck, test
- [x] Workflow per build e Docker image
- [x] Validazione OpenAPI spec
- [x] Test automatici su PR
- [ ] Release automation (opzionale per futuro)

**Stima**: 4-6 ore ✅ Completato  
**Beneficio**: Qualità garantita ad ogni commit

### Fase 7: Features Avanzate (Priorità Bassa)

#### 9. **Admin UI** (Opzionale)

- [ ] Dashboard base
- [ ] Gestione entità
- [ ] Configurazione tenant/unit
- [ ] Visualizzazione workflow

**Stima**: 20+ ore  
**Beneficio**: Interfaccia utente per gestione

#### 10. **Audit Log**

- [ ] Tracciamento modifiche entità
- [ ] History API
- [ ] User activity log

**Stima**: 6-8 ore

#### 11. **Export/Import**

- [ ] Export dati in JSON/CSV
- [ ] Import bulk
- [ ] Template per import

**Stima**: 6-8 ore

## 📋 Priorità Raccomandate

### Sprint 1 (Questa settimana)

1. ✅ Abilitare Swagger/OpenAPI
2. ✅ Migliorare gestione relazioni
3. ✅ Test base per API

### Sprint 2 (Prossima settimana)

4. ✅ Indexer con Change Streams
5. ✅ Backfill script

### Sprint 3

6. ✅ Workflow Engine base
7. ✅ Test completi

### Sprint 4

8. ✅ MCP Server
9. ✅ CI/CD

## 🎯 Quick Wins (Da fare subito)

1. **Swagger** - 2-3 ore, grande impatto
2. **Relazioni API** - 3-4 ore, migliora UX
3. **Test base** - 4-6 ore, aumenta fiducia

## 📊 Metriche di Successo

- [x] Swagger disponibile e completo ✅
- [ ] Coverage test > 80% (attualmente ~30-40%)
- [x] Indexer sincronizza automaticamente ✅
- [x] Workflow engine funzionante con almeno 3 action types ✅
- [x] CI/CD attivo ✅
- [x] Documentazione completa ✅

## 🔗 Risorse Utili

- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [BullMQ Docs](https://docs.bullmq.io/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
