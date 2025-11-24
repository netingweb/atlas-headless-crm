<!-- c151b6bc-cd36-44e6-a0a1-885c76733cb0 650f8dda-6f9d-4061-ba06-c9c2a9c6337c -->

## Servizio agenti standalone basato su MCP

### Obiettivo

Creare una nuova applicazione backend (es. `apps/agent-service/`) che espone un'API per interagire con uno o più agenti AI. Gli agenti useranno **solo** i tools esposti dal server MCP esistente, in modo che il Playground diventi un semplice client UI.

### Passi principali

1. **Progettare l’architettura del servizio agenti**

- Definire i confini chiari tra:
- server MCP (già esistente, fornisce tools)
- nuovo `agent-service` (crea/esegue agenti)
- Playground (solo UI che chiama il servizio agenti)
- Decidere il tipo di API: REST con streaming **SSE** per la parte di risposta in tempo reale.

2. **Creare il nuovo progetto `apps/agent-service`**

- Aggiungere una nuova app al monorepo (Node/TypeScript, preferibilmente stesso stack di `apps/api`).
- Definire `package.json`, `tsconfig`, script di start/build e integrazione in `docker-compose.yml`.
- Installare ed integrare `deepagents` e le dipendenze LangChain/LangGraph necessarie.

3. **Integrare il server MCP come fonte di tools**

- Implementare un client verso il server MCP (usando le stesse configurazioni tenant/unit già presenti in `apps/api` / `apps/mcp-server`).
- All’avvio o per ogni richiesta, chiamare MCP per:
- elencare i tools disponibili
- trasformarli in `DynamicStructuredTool` / tools compatibili con `deepagents`.
- Gestire errori di connessione e caching dei manifest MCP.

4. **Definire i modelli di agente (Deep Agents) e il registry multi-tenant**

- Creare un modulo (es. `agentFactory.ts`) che:
- costruisce un deep agent con pianificazione (`write_todos`) e filesystem tools se utili
- effettua il `bind` dei tools MCP
- configura provider LLM (OpenAI, ecc.) usando config per-tenant.
- Definire una configurazione **per-tenant** in file JSON (es. `config/{tenant_id}/agents.json`), che per ogni `agentId` contenga:
- tipo di agente (`orchestrator`, `subagent`, `standard`)
- provider LLM, modelli, temperature, strumenti MCP abilitati/disabilitati
- **sezione opzionale di tracing/observability** con:
  - variabili per il tracciamento (es. progetto LangSmith, sampling, ecc.)
  - tag/metadata base (es. `tenant_id`, `unit_id`, `agentId`, `environment`) da applicare a tutti i run dell’agente.
- Implementare un `AgentRegistry` che, dato `(tenant_id, agentId)`, legge il JSON del tenant relativo e costruisce l’agente corretto usando la factory `deepagents`.
- Prevedere agenti **orchestrator** che possono invocare altri agenti come subagent (usando le capacità di task/subagent di `deepagents`).

5. **Esporre gli endpoint del servizio agenti (REST + SSE)**

- Implementare endpoint principali, ad esempio:
- `POST /v1/agents/:agentId/chat` per inviare un messaggio e ricevere l’ID della sessione.
- `GET /v1/agents/:agentId/sessions/:sessionId/stream` (SSE) per ricevere in streaming eventi dell’agente (token, step di piano, tool-calls, errori, done).
- opzionale: `POST /v1/agents/:agentId/plan` per ottenere solo il piano di esecuzione (se vogliamo esporre il planning).
- Standardizzare il payload (messaggi, history, tenant_id, unit_id, eventuale contesto view/entity) e il formato degli eventi SSE (tipi di evento: `message`, `plan_step`, `tool_call`, `subagent_call`, `error`, `done`).
- Aggiungere logging dettagliato di tool-calls, step del piano, subagent invocations e errori.

6. **Separare il Playground dal motore agente**

- Modificare `apps/playground/src/lib/ai/agent.ts` per:
- rimuovere la costruzione diretta dell’agente LangChain
- trasformare `createAgent` in un client thin che chiama il nuovo `agent-service` via REST+SSE.
- Aggiornare `ChatInterface` e componenti correlati per consumare lo streaming SSE dal nuovo servizio.

7. **Configurazione, sicurezza e multi-tenant avanzato**

- Definire come passare `tenant_id`, `unit_id` e API key LLM al servizio agenti (header o payload) in modo consistente.
- Implementare autenticazione tra Playground e `agent-service` (token interno o reuse dell’auth esistente).
- Garantire isolamento tra tenant nelle chiamate MCP e nella memoria degli agenti.
- Usare i file JSON per-tenant (es. `config/{tenant_id}/agents.json`) come **unica fonte di verità** per:
- quali agenti sono disponibili per il tenant
- le loro configurazioni LLM/tools
- la configurazione **opzionale di tracing/observability** (variabili di tracciamento, tag e metadata personalizzati per quel tenant/agente).

8. **Test end-to-end e observability (incluso LangSmith)**

- Scrivere test di integrazione per un flusso completo:
- Playground → agent-service → MCP tools → risposta al client.
- Verificare la compatibilità con i tools MCP esistenti e con scenari con più agenti per tenant.
- Integrare una piattaforma di observability come **LangSmith**, usando le informazioni di tracing/metadata definite nei JSON di configurazione del tenant per:
- impostare progetto, tags e metadata per ogni run
- distinguere run per tenant, unit, agentId, ambiente
- tracciare tool calls MCP e subagent in modo strutturato.
- Aggiungere logging/metrics base (durata, numero tool-calls, agenti coinvolti, errori) per monitorare il servizio in produzione.

### To-dos

- [ ] Definire architettura e confini tra MCP server, nuovo agent-service e Playground, scegliendo REST+SSE come API di default.
- [ ] Creare la nuova app `apps/agent-service` con configurazione TypeScript/Node, script di build/start e integrazione nel monorepo.
- [ ] Implementare un client MCP nel nuovo servizio che recupera i tools e li converte in tools LangChain/deepagents.
- [ ] Creare una factory di agenti deep che usa i tools MCP e configura il modello LLM e le strategie di planning.
- [ ] Implementare endpoint HTTP (REST+eventuale streaming) per dialogare con gli agenti.
- [ ] Modificare il Playground per usare il nuovo servizio agenti invece di creare l’agente in locale nel frontend.
- [ ] Gestire auth, tenant_id, unit_id e isolamento del contesto nel nuovo servizio agenti.
- [ ] Aggiungere test end-to-end, logging e metriche di base per il servizio agenti.
