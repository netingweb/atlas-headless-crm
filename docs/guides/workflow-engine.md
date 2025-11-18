# Workflow Engine

Il Workflow Engine permette di automatizzare azioni CRM basate su eventi, schedule o trigger manuali.

## Funzionalità

- **Trigger basati su eventi**: Esegui workflow quando entità vengono create/aggiornate/eliminate
- **Trigger schedulati**: Esegui workflow su base cron
- **Trigger manuali**: Esegui workflow su richiesta
- **Action types**: update, create, delete, notify, assign, webhook, api_call, mcp_tool, chain
- **Sistema di logging completo**: Traccia tutte le esecuzioni dei workflow con dettagli completi
- **Chaining**: Esegui workflow in sequenza
- **Condizioni avanzate**: Supporto per operatori complessi e valori da dizionari

## Configurazione Workflow

I workflow sono definiti in `config/{tenant_id}/workflows.json`:

```json
{
  "tenant_id": "demo",
  "workflows": [
    {
      "workflow_id": "followup_hot_lead",
      "tenant_id": "demo",
      "unit_id": "sales",
      "name": "Follow up hot lead",
      "type": "event",
      "enabled": true,
      "status": "active",
      "trigger": {
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
      },
      "actions": [
        {
          "type": "update",
          "entity": "lead",
          "data": {
            "assigned_to": "sales_manager_1"
          }
        },
        {
          "type": "create",
          "entity": "task",
          "data": {
            "title": "Follow up hot lead",
            "type": "follow_up",
            "due_date": "{{today+1d}}"
          }
        }
      ],
      "chained_workflows": [],
      "metadata": {
        "created_by": "system",
        "description": "Automatically assign hot leads to sales manager",
        "version": 1
      }
    }
  ]
}
```

## Trigger Types

### Event Trigger

```json
{
  "type": "event",
  "event": "entity.created|entity.updated|entity.deleted",
  "entity": "contact|company|task|note|opportunity",
  "conditions": [
    {
      "field": "status",
      "operator": "==",
      "value": "hot"
    }
  ]
}
```

**Operatori supportati**: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `in`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty`

### Scheduled Trigger

```json
{
  "type": "schedule",
  "cron": "0 8 * * *",
  "entity": "opportunity",
  "conditions": [
    {
      "field": "status",
      "operator": "==",
      "value": "proposal"
    }
  ]
}
```

**Cron expression**: Usa la sintassi standard cron (es. `0 8 * * *` per ogni giorno alle 8:00)

### Manual Trigger

```json
{
  "type": "manual"
}
```

## Action Types

### Update

Aggiorna un'entità esistente:

```json
{
  "type": "update",
  "entity": "contact",
  "entity_id": "optional_id_or_from_context",
  "data": {
    "status": "qualified"
  }
}
```

### Create

Crea una nuova entità:

```json
{
  "type": "create",
  "entity": "task",
  "data": {
    "title": "Follow up",
    "type": "call",
    "due_date": "{{today+7d}}"
  }
}
```

### Delete

Elimina un'entità:

```json
{
  "type": "delete",
  "entity": "task",
  "entity_id": "optional_id_or_from_context"
}
```

### Assign

Assegna un'entità a un utente:

```json
{
  "type": "assign",
  "entity": "contact",
  "to": "user_id_123"
}
```

### Notify

Invia una notifica:

```json
{
  "type": "notify",
  "to": "user@example.com",
  "subject": "New hot lead",
  "message": "A new hot lead has been created"
}
```

### Webhook

Chiama un webhook esterno:

```json
{
  "type": "webhook",
  "webhook_url": "https://example.com/webhook",
  "webhook_method": "POST",
  "headers": {
    "Authorization": "Bearer token"
  },
  "data": {
    "custom_field": "value"
  },
  "timeout": 30000
}
```

### API Call

Chiama un endpoint interno dell'API:

```json
{
  "type": "api_call",
  "endpoint": "/api/demo/sales/entities/contact",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token"
  },
  "data": {
    "name": "New Contact"
  },
  "timeout": 30000
}
```

### MCP Tool

Esegue un tool MCP:

```json
{
  "type": "mcp_tool",
  "tool_name": "create_lead",
  "args": {
    "name": "New Lead",
    "email": "lead@example.com"
  },
  "tenant_id": "optional_or_from_context",
  "unit_id": "optional_or_from_context"
}
```

### Chain

Esegue un altro workflow in sequenza:

```json
{
  "type": "chain",
  "workflow_id": "wf_followup_01",
  "context": {
    "additional_data": "value"
  }
}
```

## Template Values

Le azioni supportano template values per accedere a dati dinamici:

- `{{field.path}}` - Accesso a campi del contesto
- `{{dictionary.key}}` - Accesso a valori del dizionario
- `{{today}}` - Data corrente (YYYY-MM-DD)
- `{{today+7d}}` - Calcoli di data (supporta `d`, `w`, `m`, `y`)
- `{{now}}` - Timestamp corrente (ISO string)

Esempio:

```json
{
  "type": "create",
  "entity": "task",
  "data": {
    "title": "Follow up {{entity.name}}",
    "due_date": "{{today+1d}}",
    "priority": "{{dictionary.urgency.high}}"
  }
}
```

## Condizioni e Dizionari

Le condizioni possono basarsi su:

- Campi specifici dell'entità (status, due_date, ecc.)
- Relazioni con altre entità
- Valori prelevati dai dizionari (dictionary.json)
- Valori calcolati o temporali (es. now, today+7d)

Esempio:

```json
{
  "conditions": [
    {
      "field": "priority",
      "operator": "==",
      "value": "{{dictionary.urgency.high}}"
    },
    {
      "field": "due_date",
      "operator": "<=",
      "value": "{{today}}"
    }
  ]
}
```

## API REST

Il Workflow Engine espone API REST complete per gestire i workflow:

### Endpoints

- `GET /api/{tenant}/{unit}/workflows` - Lista tutti i workflow
- `GET /api/{tenant}/{unit}/workflows/{id}` - Ottieni un workflow
- `POST /api/{tenant}/{unit}/workflows` - Crea un nuovo workflow
- `PUT /api/{tenant}/{unit}/workflows/{id}` - Aggiorna un workflow
- `DELETE /api/{tenant}/{unit}/workflows/{id}` - Elimina un workflow
- `PATCH /api/{tenant}/{unit}/workflows/{id}/status` - Aggiorna lo stato di un workflow
- `POST /api/{tenant}/{unit}/workflows/{id}/run` - Esegui un workflow manualmente
- `GET /api/{tenant}/{unit}/workflows/{id}/executions` - Ottieni i log di esecuzione
- `GET /api/{tenant}/{unit}/workflows/executions/{logId}` - Ottieni un log specifico
- `GET /api/{tenant}/{unit}/workflows/executions` - Ottieni tutti i log per un tenant
- `GET /api/{tenant}/{unit}/workflows/{id}/stats` - Ottieni statistiche di un workflow

### Permessi

- `crm:read` - Lettura workflow e log
- `workflows:manage` - Creazione, modifica, eliminazione workflow
- `workflows:execute` - Esecuzione manuale workflow

## Integrazione MCP

Il Workflow Engine è nativamente MCP-compatible. Tutti i workflow possono essere gestiti o invocati tramite agenti AI.

### Tool MCP disponibili

- `workflow_list` - Elenca workflow disponibili
- `workflow_get` - Ottieni un workflow per ID
- `workflow_create` - Crea un nuovo workflow via AI
- `workflow_update` - Modifica uno esistente
- `workflow_delete` - Elimina workflow
- `workflow_trigger` - Esegue un workflow manualmente
- `workflow_status` - Recupera stato e statistiche

## Sistema di Logging

Tutti gli eventi vengono loggati nel sistema di audit trail con:

- `workflow_id` - ID del workflow eseguito
- `execution_id` - ID univoco dell'esecuzione
- `trigger_type` - Tipo di trigger (event, schedule, manual)
- `trigger_event` - Evento che ha triggerato (per event-based)
- `trigger_entity` - Entità che ha triggerato
- `trigger_entity_id` - ID dell'entità che ha triggerato
- `actor` - Utente che ha eseguito (per manual) o "system"
- `status` - Stato dell'esecuzione (pending, running, completed, failed, skipped)
- `started_at` - Timestamp di inizio
- `completed_at` - Timestamp di completamento
- `duration_ms` - Durata in millisecondi
- `context` - Dati di contesto al momento del trigger
- `actions_executed` - Dettagli di ogni azione eseguita
- `conditions_evaluated` - Risultati della valutazione delle condizioni
- `error` - Eventuale errore
- `error_stack` - Stack trace dell'errore

## Avvio

```bash
# Avvia il workflow engine standalone
pnpm workflow

# Oppure usa l'API che include il workflow engine
pnpm api
```

## Integrazione con API

L'API emette eventi quando entità vengono create/aggiornate/eliminate. Il Workflow Engine è configurato per ascoltare questi eventi tramite EventEmitter2.

## Note

- I workflow sono eseguiti in modo asincrono usando BullMQ
- Redis è richiesto per il queue system
- I workflow falliti vengono loggati ma non bloccano l'esecuzione
- Il sistema di logging completo permette di tracciare tutte le esecuzioni
- Supporto per chaining di workflow per automazioni complesse
- Template values permettono di accedere a dati dinamici nelle azioni
