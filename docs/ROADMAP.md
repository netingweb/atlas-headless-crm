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

#### 2. **Migliorare Ricerca Semantica**

- [ ] Implementare indexing automatico dei campi `embeddable`
- [ ] Aggiungere endpoint per ricerche ibride (full-text + semantica)
- [ ] Implementare ranking e scoring combinato
- [ ] Aggiungere filtri avanzati nella ricerca

**Stima**: 4-6 ore  
**Beneficio**: Ricerca più potente e utile

#### 3. **Gestione Relazioni**

- [ ] Endpoint per ottenere entità correlate (es. `/company/{id}/contacts`)
- [ ] Validazione esistenza entità referenziate
- [ ] Cascade delete opzionale
- [ ] Populate automatico nelle query

**Stima**: 3-4 ore  
**Beneficio**: API più completa per dati relazionali

### Fase 3: Indexer e Sincronizzazione (Priorità Media-Alta)

#### 4. **Indexer con MongoDB Change Streams**

- [ ] Creare app `apps/indexer/`
- [ ] Implementare listener MongoDB Change Streams
- [ ] Sincronizzazione automatica MongoDB → Typesense
- [ ] Sincronizzazione automatica MongoDB → Qdrant (per campi embeddable)
- [ ] Script di backfill per dati esistenti
- [ ] Gestione errori e retry logic
- [ ] Monitoring e logging

**Stima**: 8-12 ore  
**Beneficio**: Ricerca sempre aggiornata senza intervento manuale

**Tecnologie**:

- MongoDB Change Streams
- BullMQ per job queue (opzionale)
- Worker pattern

### Fase 4: Workflow Engine (Priorità Media)

#### 5. **Workflow Engine con BullMQ**

- [ ] Creare app `apps/workflow/`
- [ ] Integrazione BullMQ con Redis
- [ ] Parser workflow da JSON config
- [ ] Trigger system (event-based, scheduled, manual)
- [ ] Action types base:
  - `update`: Aggiorna entità
  - `create`: Crea nuova entità
  - `notify`: Invia notifica (email/webhook)
  - `assign`: Assegna a utente/unit
  - `webhook`: Chiama webhook esterno
- [ ] Condition evaluation engine
- [ ] Workflow execution history
- [ ] API per trigger manuali

**Stima**: 12-16 ore  
**Beneficio**: Automazione CRM potente

**Tecnologie**:

- BullMQ
- Redis
- JSON Schema per validazione workflow

### Fase 5: MCP Server (Priorità Media)

#### 6. **MCP Server e Generator**

- [ ] Creare app `apps/mcp-server/`
- [ ] Implementare MCP protocol
- [ ] Tools per query CRM
- [ ] Generator per manifest da configurazione tenant
- [ ] Documentazione MCP

**Stima**: 8-10 ore  
**Beneficio**: Integrazione con AI assistants (Claude, GPT)

### Fase 6: Testing e Qualità (Priorità Alta)

#### 7. **Test Completi**

- [ ] Unit test per tutti i packages
- [ ] Integration test per API endpoints
- [ ] E2E test per flussi completi
- [ ] Test per relazioni tra entità
- [ ] Test per workflow engine
- [ ] Test per indexer
- [ ] Coverage > 80%

**Stima**: 10-15 ore  
**Beneficio**: Stabilità e qualità del codice

#### 8. **CI/CD con GitHub Actions**

- [ ] Workflow per lint, typecheck, test
- [ ] Workflow per build e Docker image
- [ ] Validazione OpenAPI spec
- [ ] Test automatici su PR
- [ ] Release automation

**Stima**: 4-6 ore  
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

- [ ] Swagger disponibile e completo
- [ ] Coverage test > 80%
- [ ] Indexer sincronizza automaticamente
- [ ] Workflow engine funzionante con almeno 3 action types
- [ ] CI/CD attivo
- [ ] Documentazione completa

## 🔗 Risorse Utili

- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [BullMQ Docs](https://docs.bullmq.io/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
