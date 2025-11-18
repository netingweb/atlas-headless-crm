# Analisi Completa del Sistema Workflow

## 📋 Panoramica Generale

Il sistema workflow di CRM-Atlas è un motore di automazione completo che permette di eseguire azioni automatiche basate su eventi, schedulazioni o trigger manuali. Il sistema è composto da due parti principali:

1. **Backend/Server**: API NestJS + Workflow Engine standalone
2. **Frontend/Playground**: Interfaccia React per gestione e monitoraggio

---

## 🏗️ Architettura del Sistema

### Componenti Principali

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYGROUND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ WorkflowsList│  │WorkflowDetail│  │  API Client   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘     │
└─────────┼──────────────────┼─────────────────┼──────────────┘
          │                  │                 │
          └──────────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API (NestJS)                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ WorkflowsModule  │  │  EntitiesService  │               │
│  │                  │  │                  │               │
│  │ - Controller     │  │ - Emit Events    │               │
│  │ - Service        │  │   (created/      │               │
│  │                  │  │    updated/      │               │
│  └────────┬─────────┘  │    deleted)     │               │
│           │             └────────┬─────────┘               │
│           │                      │                          │
│           │         ┌────────────▼──────────┐              │
│           │         │   EventEmitter2        │              │
│           │         │   (NestJS Events)     │              │
│           │         └────────────┬──────────┘              │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                     │                                       │
│                     ▼                                       │
│         ┌───────────────────────┐                          │
│         │  WorkflowEngine       │                          │
│         │  (Injected)          │                          │
│         └───────────┬───────────┘                          │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              WORKFLOW ENGINE (Standalone)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Queues     │  │   Workers    │  │   Logger      │     │
│  │  (BullMQ)    │  │  (BullMQ)    │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                            │                                │
│                            ▼                                │
│              ┌───────────────────────┐                      │
│              │   ActionRunner        │                      │
│              │   (Execute Actions)   │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE & STORAGE                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   MongoDB    │  │    Redis     │  │   Typesense   │     │
│  │ - Workflows  │  │   (Queues)   │  │  (Search)     │     │
│  │ - Logs       │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Parte Server (Backend)

### 1. API Layer (NestJS)

#### WorkflowsController

**File**: `apps/api/src/workflows/workflows.controller.ts`

Gestisce tutte le richieste HTTP per i workflow:

```typescript
// Endpoints principali:
GET    /:tenant/:unit/workflows              // Lista workflow
GET    /:tenant/:unit/workflows/:id          // Dettaglio workflow
POST   /:tenant/:unit/workflows              // Crea workflow
PUT    /:tenant/:unit/workflows/:id          // Aggiorna workflow
DELETE /:tenant/:unit/workflows/:id          // Elimina workflow
PATCH  /:tenant/:unit/workflows/:id/status   // Cambia stato
POST   /:tenant/:unit/workflows/:id/run      // Esegui manualmente
GET    /:tenant/:unit/workflows/:id/executions // Log esecuzioni
GET    /:tenant/:unit/workflows/:id/stats    // Statistiche
```

**Caratteristiche**:

- Autenticazione JWT con guard
- Controllo permessi con scope (`crm:read`, `workflows:manage`, `workflows:execute`)
- Validazione automatica tramite DTO
- Documentazione Swagger integrata

#### WorkflowsService

**File**: `apps/api/src/workflows/workflows.service.ts`

Business logic per la gestione dei workflow:

**Funzionalità principali**:

1. **CRUD Operations**: Create, Read, Update, Delete workflow
2. **Validazione**: Controlla che la definizione del workflow sia valida
3. **Trigger Manuale**: Esegue workflow su richiesta
4. **Logging**: Recupera log di esecuzione e statistiche
5. **Reload Engine**: Ricarica il workflow engine quando i workflow cambiano

**Flusso di creazione workflow**:

```typescript
1. Genera workflow_id univoco (se non fornito)
2. Valida la definizione del workflow
3. Salva in MongoDB (collection 'workflows')
4. Ricarica il WorkflowEngine per attivare il nuovo workflow
```

### 2. Workflow Engine (Standalone)

#### WorkflowEngine

**File**: `apps/workflow/src/workflow-engine.ts`

Il cuore del sistema di automazione.

**Componenti principali**:

1. **Queue System (BullMQ)**
   - Una coda Redis per ogni workflow
   - Nome coda: `workflow_{tenantId}_{unitId}_{workflowId}`
   - Gestisce l'esecuzione asincrona

2. **Worker System**
   - Un worker per ogni coda
   - Esegue i job in background
   - Gestisce errori e retry

3. **Trigger Setup**

   **Event Trigger**:

   ```typescript
   - Ascolta eventi da EventEmitter2
   - Eventi: 'entity.created', 'entity.updated', 'entity.deleted'
   - Filtra per tenant_id, unit_id, entity
   - Valuta condizioni prima di accodare
   ```

   **Schedule Trigger**:

   ```typescript
   - Usa cron expressions (es. "0 8 * * *")
   - Crea job ripetibili in BullMQ
   - Esegue a intervalli regolari
   ```

   **Manual Trigger**:

   ```typescript
   - Eseguito via API endpoint /run
   - Accetta context personalizzato
   - Traccia l'attore (utente che ha eseguito)
   ```

4. **Esecuzione Workflow**

   **Flusso completo**:

   ```
   1. Job accodato in Redis
   2. Worker preleva il job
   3. Crea log di esecuzione (status: 'pending')
   4. Valuta condizioni (se presenti)
   5. Se condizioni non soddisfatte → status: 'skipped'
   6. Altrimenti → status: 'running'
   7. Esegue azioni in sequenza:
      - Per ogni azione:
        a. Log azione (status: 'pending')
        b. Esegue azione via ActionRunner
        c. Log risultato (status: 'completed' o 'failed')
   8. Esegue chained workflows (se presenti)
   9. Aggiorna log finale (status: 'completed' o 'failed')
   ```

5. **Valutazione Condizioni**

   **Operatori supportati**:
   - `==`, `!=` - Uguaglianza
   - `>`, `<`, `>=`, `<=` - Confronti numerici
   - `contains`, `in` - Contenimento
   - `startsWith`, `endsWith` - String matching
   - `isEmpty`, `isNotEmpty` - Controllo esistenza

   **Template values nelle condizioni**:
   - `{{field.path}}` - Accesso a campi del contesto
   - `{{dictionary.key}}` - Valori da dizionari
   - `{{today}}`, `{{today+7d}}` - Date calcolate
   - `{{now}}` - Timestamp corrente

#### ActionRunner

**File**: `apps/workflow/src/action-runner.ts`

Esegue le singole azioni dei workflow.

**Tipi di azioni supportate**:

1. **update**: Aggiorna un'entità esistente

   ```typescript
   - Risolve template values nei dati
   - Usa EntityRepository per aggiornare
   - Restituisce entità aggiornata
   ```

2. **create**: Crea una nuova entità

   ```typescript
   - Risolve template values nei dati
   - Usa EntityRepository per creare
   - Restituisce entità creata con _id
   ```

3. **delete**: Elimina un'entità

   ```typescript
   - Usa entity_id da action o context
   - Usa EntityRepository per eliminare
   - Restituisce conferma eliminazione
   ```

4. **webhook**: Chiama webhook esterno

   ```typescript
   - Supporta GET, POST, PUT, DELETE, PATCH
   - Headers personalizzabili
   - Timeout configurabile (default: 30s)
   - Risolve template values nei dati
   ```

5. **api_call**: Chiama endpoint interno API

   ```typescript
   - Endpoint relativo a API_BASE_URL
   - Supporta tutti i metodi HTTP
   - Headers e timeout configurabili
   ```

6. **mcp_tool**: Esegue tool MCP

   ```typescript
   - Richiede MCPService nel context
   - Passa tenant_id e unit_id
   - Risolve template values negli args
   ```

7. **notify**: Invia notifica

   ```typescript
   - Placeholder per implementazione notifiche
   - Risolve template values in subject e message
   - Log attuale (da implementare email/push)
   ```

8. **chain**: Esegue altro workflow
   ```typescript
   - Restituisce workflow_id e context
   - Gestito dal WorkflowEngine per triggerare
   - Permette workflow in sequenza
   ```

**Template Value Resolution**:

```typescript
// Supporta:
- {{field.path}} → context.field.path
- {{dictionary.key}} → dictionary.key
- {{today}} → YYYY-MM-DD
- {{today+7d}} → Data + 7 giorni
- {{now}} → ISO timestamp
```

#### WorkflowLogger

**File**: `apps/workflow/src/workflow-logger.ts`

Sistema completo di logging per tutte le esecuzioni.

**Dati loggati**:

- `log_id`: ID univoco del log
- `workflow_id`: ID del workflow eseguito
- `execution_id`: ID univoco dell'esecuzione
- `trigger_type`: event | schedule | manual
- `trigger_event`: Nome evento (per event trigger)
- `trigger_entity`: Entità che ha triggerato
- `trigger_entity_id`: ID entità
- `actor`: Utente che ha eseguito (per manual) o "system"
- `status`: pending | running | completed | failed | skipped
- `started_at`, `completed_at`: Timestamps
- `duration_ms`: Durata in millisecondi
- `context`: Dati di contesto al momento del trigger
- `actions_executed`: Array con dettagli di ogni azione
- `conditions_evaluated`: Risultati valutazione condizioni
- `error`, `error_stack`: Dettagli errori

**Operazioni**:

- `createExecutionLog()`: Crea nuovo log
- `updateExecutionStatus()`: Aggiorna stato esecuzione
- `addActionExecution()`: Aggiunge log azione
- `updateActionExecution()`: Aggiorna stato azione
- `addConditionEvaluations()`: Aggiunge risultati condizioni
- `getWorkflowExecutions()`: Recupera log per workflow
- `getTenantExecutions()`: Recupera tutti i log per tenant
- `getWorkflowStats()`: Calcola statistiche

### 3. Integrazione Eventi

**File**: `apps/api/src/entities/entities.events.ts`

Il sistema emette eventi quando le entità cambiano:

```typescript
// Quando un'entità viene creata:
eventEmitter.emit('entity.created', {
  tenant_id,
  unit_id,
  entity,
  entity_id,
  data,
});

// Quando un'entità viene aggiornata:
eventEmitter.emit('entity.updated', {
  tenant_id,
  unit_id,
  entity,
  entity_id,
  data,
});

// Quando un'entità viene eliminata:
eventEmitter.emit('entity.deleted', {
  tenant_id,
  unit_id,
  entity,
  entity_id,
});
```

**File**: `apps/api/src/workflows/workflows.module.ts`

Il WorkflowsModule inizializza il WorkflowEngine con l'EventEmitter:

```typescript
onModuleInit() {
  // Crea WorkflowEngine con EventEmitter2
  this.workflowEngine = new WorkflowEngine(this.eventEmitter);
  await this.workflowEngine.start();

  // Inietta nel service
  this.workflowsService.setWorkflowEngine(this.workflowEngine);
}
```

Il WorkflowEngine si registra agli eventi e valuta se eseguire workflow.

---

## 🎨 Parte Playground (Frontend)

### 1. WorkflowsList Component

**File**: `apps/playground/src/pages/WorkflowsList.tsx`

Vista principale per elencare tutti i workflow.

**Funzionalità**:

- Lista tabellare di tutti i workflow
- Mostra: nome, tipo, stato, ultima esecuzione
- Azioni: visualizza, attiva/sospendi, elimina
- Tab "Executions" per vedere tutti i log
- Filtri e ordinamento

**Stati workflow**:

- **Active** (Badge verde): enabled=true e status='active'
- **Inactive** (Badge grigio): disabled o status!='active'

**API calls**:

```typescript
- workflowsApi.list() → GET /workflows
- workflowsApi.getAllExecutions() → GET /workflows/executions
- workflowsApi.updateStatus() → PATCH /workflows/:id/status
- workflowsApi.delete() → DELETE /workflows/:id
```

### 2. WorkflowDetail Component

**File**: `apps/playground/src/pages/WorkflowDetail.tsx`

Vista dettagliata per creare/modificare/visualizzare un workflow.

**Tabs principali**:

1. **Form Tab**:
   - Informazioni base (nome, tipo, stato, enabled)
   - Trigger configuration (JSON editor)
   - Actions configuration (JSON editor)
   - Validazione in tempo reale

2. **JSON Tab**:
   - Vista completa del workflow in JSON
   - Editing diretto del JSON
   - Sincronizzazione bidirezionale con form
   - Copy to clipboard

3. **Executions Tab** (solo per workflow esistenti):
   - Tabella con tutte le esecuzioni
   - Colonne: Execution ID, Trigger, Status, Started, Completed, Duration
   - Badge colorati per status
   - Formattazione date con date-fns

**Funzionalità speciali**:

1. **Execute Now Dialog**:

   ```typescript
   - Pulsante "Execute Now" per workflow esistenti
   - Dialog con:
     * Context JSON editor (opzionale)
     * Actor field (opzionale)
   - Chiama workflowsApi.trigger()
   - Mostra execution_id nel toast
   ```

2. **Save/Create**:

   ```typescript
   - Se nuovo workflow: createMutation
   - Se esistente: updateMutation
   - Naviga a /workflows/:id dopo creazione
   - Invalida query cache per refresh
   ```

3. **Real-time Updates**:
   ```typescript
   - useQuery per workflow data
   - useQuery per executions
   - Auto-refresh dopo mutazioni
   - Loading states
   ```

### 3. API Client

**File**: `apps/playground/src/lib/api/workflows.ts`

Client TypeScript per tutte le chiamate API workflow.

**Metodi disponibili**:

```typescript
list(tenant, unit) → WorkflowDefinition[]
get(tenant, unit, id) → WorkflowDefinition
create(tenant, unit, workflow) → WorkflowDefinition
update(tenant, unit, id, updates) → WorkflowDefinition
delete(tenant, unit, id) → void
updateStatus(tenant, unit, id, status, enabled?) → WorkflowDefinition
trigger(tenant, unit, id, context?, actor?) → { execution_id: string }
getExecutions(tenant, unit, id, limit, offset) → WorkflowExecutionLog[]
getAllExecutions(tenant, unit, limit, offset, filters?) → WorkflowExecutionLog[]
getExecution(tenant, unit, logId) → WorkflowExecutionLog
getStats(tenant, unit, id) → WorkflowStats
```

**Caratteristiche**:

- Type-safe con TypeScript
- Usa apiClient base (gestisce auth, errori)
- Parametri opzionali per filtri
- Restituisce tipi corretti da `@crm-atlas/types`

---

## 🔄 Flusso Completo di Esecuzione

### Scenario: Workflow Event-Based

```
1. UTENTE aggiorna un Lead nel Playground
   ↓
2. API EntitiesService.update() viene chiamato
   ↓
3. EntityEvents.emitEntityUpdated() emette evento
   ↓
4. EventEmitter2 propaga 'entity.updated' event
   ↓
5. WorkflowEngine.setupEventTrigger() ha listener registrato
   ↓
6. Listener verifica:
   - tenant_id match? ✓
   - unit_id match? ✓
   - entity match? ✓
   ↓
7. WorkflowEngine.tryQueueExecution()
   - Valuta condizioni (se presenti)
   - Se condizioni OK → accoda job
   ↓
8. BullMQ Queue aggiunge job a Redis
   ↓
9. BullMQ Worker preleva job
   ↓
10. WorkflowEngine.executeWorkflow()
    - Crea/aggiorna execution log (status: 'running')
    - Valuta condizioni di nuovo
    - Se condizioni OK:
      ↓
11. Per ogni azione in workflow.actions:
    - ActionRunner.executeAction()
    - Log azione (status: 'running')
    - Esegue azione (es. update, create, webhook)
    - Log risultato (status: 'completed' o 'failed')
    ↓
12. Se tutte azioni OK:
    - Esegue chained_workflows (se presenti)
    - Aggiorna log (status: 'completed')
    ↓
13. Se errore:
    - Aggiorna log (status: 'failed')
    - Logga error e stack trace
    ↓
14. Playground può vedere il log:
    - GET /workflows/:id/executions
    - Mostra in tab "Executions"
```

### Scenario: Workflow Manual

```
1. UTENTE clicca "Execute Now" nel Playground
   ↓
2. WorkflowDetail.handleExecute()
   - Valida JSON context (opzionale)
   - Chiama workflowsApi.trigger()
   ↓
3. API WorkflowsController.triggerWorkflow()
   ↓
4. WorkflowsService.triggerWorkflow()
   ↓
5. WorkflowEngine.triggerWorkflow()
   - Crea execution log (status: 'pending')
   - Accoda job manuale
   ↓
6. (Stesso flusso da punto 8 in poi)
```

### Scenario: Workflow Scheduled

```
1. WorkflowEngine.setupScheduleTrigger()
   - Crea repeatable job in BullMQ
   - Cron expression: "0 8 * * *" (ogni giorno alle 8:00)
   ↓
2. BullMQ scheduler esegue job all'orario programmato
   ↓
3. WorkflowEngine.executeWorkflow()
   - Context contiene trigger_type: 'schedule'
   - (Stesso flusso da punto 10 in poi)
```

---

## 📊 Struttura Dati

### WorkflowDefinition

```typescript
{
  workflow_id: string;           // ID univoco
  tenant_id: string;             // Tenant owner
  unit_id?: string;              // Unit owner (opzionale)
  name: string;                  // Nome descrittivo
  type: 'event' | 'schedule' | 'manual';
  enabled: boolean;              // Abilitato/disabilitato
  status: 'active' | 'inactive' | 'draft';
  trigger: WorkflowTrigger;      // Configurazione trigger
  actions: WorkflowAction[];     // Array di azioni
  chained_workflows?: string[];  // Workflow da eseguire dopo
  metadata?: {
    created_by?: string;
    description?: string;
    tags?: string[];
    version?: number;
  };
  created_at?: string;
  updated_at?: string;
}
```

### WorkflowTrigger

```typescript
// Event Trigger
{
  type: 'event';
  event: 'entity.created' | 'entity.updated' | 'entity.deleted';
  entity?: string;              // Filtro entità (opzionale)
  conditions?: WorkflowCondition[];
}

// Schedule Trigger
{
  type: 'schedule';
  cron: string;                 // Cron expression
  entity?: string;              // Filtro entità (opzionale)
  conditions?: WorkflowCondition[];
}

// Manual Trigger
{
  type: 'manual';
}
```

### WorkflowAction

```typescript
// Update Action
{
  type: 'update';
  entity: string;
  entity_id?: string;           // Opzionale, usa context.entity_id
  data: Record<string, unknown>; // Supporta template values
}

// Create Action
{
  type: 'create';
  entity: string;
  data: Record<string, unknown>; // Supporta template values
}

// Delete Action
{
  type: 'delete';
  entity: string;
  entity_id?: string;           // Opzionale, usa context.entity_id
}

// Webhook Action
{
  type: 'webhook';
  webhook_url: string;
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: Record<string, unknown>; // Supporta template values
  timeout?: number;             // Default: 30000ms
}

// API Call Action
{
  type: 'api_call';
  endpoint: string;             // Relativo a API_BASE_URL
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: Record<string, unknown>; // Supporta template values
  timeout?: number;             // Default: 30000ms
}

// MCP Tool Action
{
  type: 'mcp_tool';
  tool_name: string;
  args: Record<string, unknown>; // Supporta template values
  tenant_id?: string;           // Opzionale, usa context
  unit_id?: string;             // Opzionale, usa context
}

// Notify Action
{
  type: 'notify';
  to: string;                    // User ID o email
  subject?: string;              // Supporta template values
  message: string;               // Supporta template values
  data?: Record<string, unknown>;
}

// Chain Action
{
  type: 'chain';
  workflow_id: string;
  context?: Record<string, unknown>; // Context aggiuntivo
}
```

### WorkflowExecutionLog

```typescript
{
  log_id: string;                // ID univoco del log
  workflow_id: string;
  tenant_id: string;
  unit_id?: string;
  execution_id: string;          // ID univoco esecuzione
  trigger_type: 'event' | 'schedule' | 'manual';
  trigger_event?: string;        // Nome evento (per event)
  trigger_entity?: string;       // Entità che ha triggerato
  trigger_entity_id?: string;     // ID entità
  actor?: string;                // Utente (per manual) o "system"
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;            // ISO timestamp
  completed_at?: string;          // ISO timestamp
  duration_ms?: number;           // Durata in millisecondi
  context?: Record<string, unknown>; // Context al trigger
  actions_executed: Array<{
    action_index: number;
    action_type: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
    result?: unknown;
    error?: string;
  }>;
  conditions_evaluated?: Array<{
    condition: WorkflowCondition;
    result: boolean;
    field_value?: unknown;
  }>;
  error?: string;
  error_stack?: string;
  chained_workflows?: string[];
}
```

---

## 🔐 Sicurezza e Permessi

### Scope Richiesti

1. **crm:read**
   - GET /workflows (lista)
   - GET /workflows/:id (dettaglio)
   - GET /workflows/:id/executions (log)
   - GET /workflows/:id/stats (statistiche)

2. **workflows:manage**
   - POST /workflows (crea)
   - PUT /workflows/:id (aggiorna)
   - DELETE /workflows/:id (elimina)
   - PATCH /workflows/:id/status (cambia stato)

3. **workflows:execute**
   - POST /workflows/:id/run (esegui manualmente)

### Validazione

- **WorkflowDefinition**: Validato con Zod schema
- **Trigger**: Deve matchare workflow.type
- **Actions**: Deve avere almeno un'azione
- **Cron**: Validato (basic validation)
- **Template Values**: Risolti in modo sicuro (no code injection)

---

## 🚀 Come Usare il Sistema

### 1. Creare un Workflow via Playground

```
1. Vai a /workflows/new
2. Compila:
   - Nome: "Follow up hot lead"
   - Tipo: "Event"
   - Status: "Active"
   - Enabled: ✓
3. Configura Trigger (JSON):
   {
     "type": "event",
     "event": "entity.updated",
     "entity": "lead",
     "conditions": [
       {
         "field": "status",
         "operator": "==",
         "value": "hot"
       }
     ]
   }
4. Configura Actions (JSON):
   [
     {
       "type": "create",
       "entity": "task",
       "data": {
         "title": "Follow up {{entity.name}}",
         "due_date": "{{today+1d}}"
       }
     }
   ]
5. Clicca "Create"
```

### 2. Eseguire Manualmente

```
1. Vai a /workflows/:id
2. Clicca "Execute Now"
3. (Opzionale) Inserisci Context JSON:
   {
     "entity_id": "lead_123",
     "entity": {
       "name": "Test Lead",
       "status": "hot"
     }
   }
4. (Opzionale) Inserisci Actor: "user_123"
5. Clicca "Execute"
6. Vai al tab "Executions" per vedere il risultato
```

### 3. Monitorare Esecuzioni

```
1. Vai a /workflows
2. Tab "Executions" per vedere tutti i log
3. Oppure vai a /workflows/:id
4. Tab "Executions" per vedere log di quel workflow
5. Vedi:
   - Status (completed/failed/skipped)
   - Durata
   - Timestamp
   - Dettagli azioni eseguite
```

---

## 📝 Note Tecniche

### Dipendenze

- **BullMQ**: Queue system basato su Redis
- **Redis**: Richiesto per le code
- **MongoDB**: Storage workflow e log
- **EventEmitter2**: Sistema eventi NestJS
- **Zod**: Validazione schemi

### Performance

- Esecuzione asincrona (non blocca API)
- Queue system per gestire carico
- Logging completo per debugging
- Statistiche per monitoraggio

### Limitazioni Attuali

- Notify action è placeholder (da implementare)
- Dictionary resolution limitata (solo da context)
- No retry automatico su errori
- No rate limiting
- No workflow versioning avanzato

### Estensioni Future Possibili

- Workflow builder visuale
- Test workflow in sandbox
- Workflow templates
- Conditional branching (if/else)
- Parallel actions
- Workflow variables
- Advanced retry policies
- Webhook signatures
- Workflow analytics dashboard

---

## 🎯 Conclusioni

Il sistema workflow di CRM-Atlas è un motore di automazione completo e ben strutturato che permette:

✅ **Automazione basata su eventi**: Reagisce a cambiamenti nelle entità
✅ **Schedulazione**: Esegue workflow a intervalli regolari
✅ **Esecuzione manuale**: Trigger on-demand via API/UI
✅ **Logging completo**: Traccia tutte le esecuzioni
✅ **Azioni flessibili**: 8 tipi di azioni diverse
✅ **Template values**: Accesso dinamico ai dati
✅ **Chaining**: Workflow in sequenza
✅ **Condizioni avanzate**: Logica complessa nei trigger
✅ **UI completa**: Gestione e monitoraggio nel Playground
✅ **Type-safe**: TypeScript end-to-end
✅ **Sicuro**: Autenticazione e autorizzazione

Il sistema è pronto per l'uso in produzione e può essere esteso facilmente per nuove funzionalità.
