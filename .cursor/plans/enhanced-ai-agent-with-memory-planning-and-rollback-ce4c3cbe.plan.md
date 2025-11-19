<!-- ce4c3cbe-7d1d-4f73-9388-df462a9f0ce7 242974e9-4c08-42df-8c75-d9fad56477ca -->

# Enhanced AI Agent Implementation Plan

## Obiettivi

1. **Memoria persistente con summarization** basata su token (configurabile)
2. **Consapevolezza del contesto** della view corrente (entity type, entity id)
3. **Planning strategy** configurabile (Plan-and-Execute per iniziare)
4. **Visualizzazione del processo** di pensiero, planning e tool calls
5. **Feedback in tempo reale** con aggiornamento automatico + notifiche
6. **Rollback persistente** delle azioni dell'agente

## Architettura

### 1. Sistema di Memoria e Summarization

**File da creare/modificare:**

- `apps/playground/src/lib/ai/memory.ts` (nuovo) - Gestione memoria e summarization
- `apps/playground/src/stores/ai-store.ts` - Aggiungere configurazione maxTokens per summarization
- `apps/playground/src/lib/ai/agent.ts` - Integrare memoria nel flusso dell'agente

**Implementazione:**

- Creare `MemoryManager` che:
  - Mantiene storico conversazioni con metadata (timestamp, token count)
  - Calcola token count usando tiktoken o stima approssimativa
  - Quando supera `maxContextTokens`, genera summary usando LLM
  - Mantiene summary + ultimi N messaggi recenti
  - Persiste memoria in localStorage/IndexedDB
- Aggiungere configurazione `maxContextTokens` in AI store (default: 8000)
- Integrare nel system prompt: includere summary + ultimi messaggi

### 2. Consapevolezza del Contesto della View

**File da creare/modificare:**

- `apps/playground/src/stores/context-store.ts` (nuovo) - Store per contesto corrente
- `apps/playground/src/components/layout/MainLayout.tsx` - Tracciare route corrente
- `apps/playground/src/lib/ai/agent.ts` - Includere contesto nel system prompt
- `apps/playground/src/components/ai/ChatInterface.tsx` - Passare contesto all'agente

**Implementazione:**

- Creare `useContextStore` che traccia:
  - Route corrente (`/entities/contact/123`)
  - Entity type (`contact`)
  - Entity id (`123`)
  - Entity data (opzionale, per riferimento rapido)
- Aggiornare store quando cambia route (useEffect su location)
- Includere nel system prompt: "You are currently viewing [entityType] with id [entityId]"
- Permettere all'agente di usare questo contesto implicitamente nelle richieste

### 3. Planning Strategy Configurabile

**File da creare/modificare:**

- `apps/playground/src/lib/ai/planner.ts` (nuovo) - Implementazione Plan-and-Execute
- `apps/playground/src/stores/ai-store.ts` - Aggiungere `planningStrategy` config
- `apps/playground/src/lib/ai/agent.ts` - Integrare planner nel flusso
- `apps/playground/src/pages/Settings.tsx` - UI per configurare planning strategy

**Implementazione:**

- Creare `PlanAndExecutePlanner` che:
  - Genera piano multi-step usando LLM (prompt dedicato)
  - Formatta piano come lista di task con dipendenze
  - Esegue task in sequenza
  - Supporta re-planning se necessario
- Aggiungere enum `PlanningStrategy` con valori: `'plan-and-execute' | 'react' | 'none'`
- Modificare `runAgentStream` per:
  - Se planning enabled: generare piano → mostrare piano → eseguire task
  - Emettere eventi `plan_created`, `plan_step_started`, `plan_step_completed`
- Aggiungere UI in Settings per selezionare strategy

### 4. Visualizzazione del Processo di Pensiero

**File da modificare:**

- `apps/playground/src/lib/ai/agent.ts` - Emettere eventi per planning
- `apps/playground/src/components/ai/ChatInterface.tsx` - Visualizzare piano e step
- `apps/playground/src/components/ai/MessageView.tsx` (nuovo) - Componente per visualizzare messaggi con planning

**Implementazione:**

- Estendere `StreamEvent` con:
  - `plan_created`: { plan: PlanStep[] }
  - `plan_step_started`: { stepIndex: number, step: PlanStep }
  - `plan_step_completed`: { stepIndex: number, result: string }
- Creare componente `PlanView` che mostra:
  - Lista step del piano con status (pending/running/completed/error)
  - Tool calls per ogni step
  - Risultati in tempo reale
- Aggiornare `Message` interface per includere `plan?: Plan`

### 5. Feedback in Tempo Reale

**File da modificare:**

- `apps/playground/src/lib/ai/agent.ts` - Emettere eventi quando modifica entities
- `apps/playground/src/components/ai/ChatInterface.tsx` - Gestire aggiornamenti
- `apps/playground/src/pages/EntityDetail.tsx` - Re-fetch quando agente modifica
- `apps/playground/src/lib/api/entities.ts` - Wrapper per tracciare modifiche

**Implementazione:**

- Quando agente chiama tool che modifica entity:
  - Emettere evento `entity_updated`: { entityType, entityId, changes }
- In `ChatInterface`:
  - Se entity modificata è quella corrente → invalidare React Query cache
  - Mostrare toast notification con link per vedere modifiche
- Usare `queryClient.invalidateQueries` per refresh automatico

### 6. Sistema di Rollback Persistente

**File da creare/modificare:**

- `apps/playground/src/lib/ai/rollback.ts` (nuovo) - Gestione rollback
- `apps/playground/src/stores/rollback-store.ts` (nuovo) - Store per azioni rollbackabili
- `apps/playground/src/lib/ai/agent.ts` - Tracciare azioni modificanti
- `apps/playground/src/components/ai/ChatInterface.tsx` - UI per rollback
- `apps/api/src/entities/entities.service.ts` - Endpoint per rollback (opzionale, può essere client-side)

**Implementazione:**

- Creare `RollbackManager` che:
  - Traccia tutte le azioni modificanti (create/update/delete) con:
    - Timestamp
    - Entity type/id
    - Dati prima/dopo
    - Tool call che ha causato la modifica
  - Persiste in localStorage/IndexedDB
  - Supporta rollback singolo o batch per sessione
- Per ogni tool call modificante:
  - Prima dell'esecuzione: salvare stato corrente
  - Dopo l'esecuzione: salvare nuovo stato + creare entry rollback
- UI: bottone "Undo" per ultima azione o lista azioni con rollback selettivo
- Rollback: ripristinare stato precedente chiamando API update/delete

## Struttura File

```
apps/playground/src/
├── lib/ai/
│   ├── agent.ts (modificare)
│   ├── memory.ts (nuovo)
│   ├── planner.ts (nuovo)
│   └── rollback.ts (nuovo)
├── stores/
│   ├── ai-store.ts (modificare)
│   ├── context-store.ts (nuovo)
│   └── rollback-store.ts (nuovo)
├── components/ai/
│   ├── ChatInterface.tsx (modificare)
│   ├── MessageView.tsx (nuovo)
│   └── PlanView.tsx (nuovo)
└── pages/
    └── Settings.tsx (modificare)
```

## Dettagli Implementazione

### Memory Manager

- Usa tiktoken per conteggio token preciso (o stima 4 chars = 1 token)
- Summary prompt: "Summarize the following conversation history, focusing on key decisions, entity references, and user preferences"
- Mantiene: summary + ultimi 10 messaggi (o ultimi 2000 token)

### Context Store

- Usa `useLocation` da react-router per tracciare route
- Parse route: `/entities/:entityType/:id` → { entityType, id }
- Fornisce hook `useCurrentContext()` per accesso facile

### Planner

- Prompt planning: "Given the user request, create a step-by-step plan. Each step should be a tool call or reasoning step."
- Formato piano: `{ steps: [{ step: number, description: string, tool?: string, args?: object }] }`
- Esecuzione: sequenziale con possibilità di re-plan se step fallisce

### Rollback

- Struttura: `{ id, timestamp, action: 'create'|'update'|'delete', entityType, entityId, beforeState?, afterState, toolCall }`
- Persistenza: IndexedDB per storage più robusto
- UI: mostra ultime N azioni con possibilità di rollback

## Configurazioni Aggiuntive

Aggiungere in `ai-store.ts`:

- `maxContextTokens: number` (default: 8000)
- `planningStrategy: 'plan-and-execute' | 'react' | 'none'` (default: 'plan-and-execute')
- `enableRollback: boolean` (default: true)
- `autoRefreshOnUpdate: boolean` (default: true)

## Testing

- Test memoria: verificare summarization quando supera token limit
- Test contesto: verificare che agente usi entity corrente implicitamente
- Test planning: verificare generazione ed esecuzione piano
- Test rollback: verificare persistenza e ripristino stato
- Test feedback: verificare aggiornamento automatico UI

### To-dos

- [ ] Implementare MemoryManager con summarization basata su token (memory.ts, integrazione in agent.ts, configurazione in ai-store.ts)
- [ ] Creare context-store per tracciare view corrente e integrare nel system prompt (context-store.ts, MainLayout.tsx, agent.ts)
- [ ] Implementare Plan-and-Execute planner configurabile (planner.ts, agent.ts, Settings.tsx, ai-store.ts)
- [ ] Creare UI per visualizzare piano e processo di pensiero (PlanView.tsx, MessageView.tsx, ChatInterface.tsx)
- [ ] Implementare feedback in tempo reale con aggiornamento automatico e notifiche (agent.ts, ChatInterface.tsx, EntityDetail.tsx)
- [ ] Implementare sistema di rollback persistente (rollback.ts, rollback-store.ts, ChatInterface.tsx)
