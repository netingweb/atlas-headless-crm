# Esempio: Creare e Salvare un Workflow

## Metodo 1: Tramite API REST

### 1. Autenticazione

Prima di tutto, fai login per ottenere il token JWT:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "demo",
    "email": "admin@demo.local",
    "password": "changeme"
  }'
```

Risposta:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Creare un Workflow Event-Based

```bash
curl -X POST http://localhost:3000/api/demo/sales/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Assegna Lead Caldo",
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
          "title": "Follow up lead caldo",
          "type": "follow_up",
          "due_date": "{{today+1d}}"
        }
      }
    ],
    "metadata": {
      "description": "Assegna automaticamente lead caldi al sales manager",
      "created_by": "admin"
    }
  }'
```

**Nota:** Il campo `workflow_id` è opzionale e verrà generato automaticamente se non fornito.

### 3. Creare un Workflow Schedule-Based

```bash
curl -X POST http://localhost:3000/api/demo/sales/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Reminder Preventivi",
    "type": "schedule",
    "enabled": true,
    "status": "active",
    "trigger": {
      "type": "schedule",
      "cron": "0 8 * * *",
      "entity": "opportunity",
      "conditions": [
        {
          "field": "status",
          "operator": "==",
          "value": "proposal"
        },
        {
          "field": "updated_at",
          "operator": "<=",
          "value": "{{today-7d}}"
        }
      ]
    },
    "actions": [
      {
        "type": "notify",
        "to": "sales_manager_1",
        "subject": "Reminder: Preventivi in Sospeso",
        "message": "Ci sono preventivi in sospeso da più di 7 giorni."
      }
    ],
    "metadata": {
      "description": "Reminder giornaliero alle 8:00 per preventivi in sospeso",
      "created_by": "admin"
    }
  }'
```

### 4. Creare un Workflow con Webhook

```bash
curl -X POST http://localhost:3000/api/demo/sales/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Notifica Esterna Lead",
    "type": "event",
    "enabled": true,
    "status": "active",
    "trigger": {
      "type": "event",
      "event": "entity.created",
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
        "type": "webhook",
        "webhook_url": "https://external-api.example.com/webhooks/lead",
        "webhook_method": "POST",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        },
        "data": {
          "lead_id": "{{context.entity_id}}",
          "lead_name": "{{context.entity.name}}",
          "status": "{{context.entity.status}}"
        },
        "timeout": 10000
      }
    ],
    "metadata": {
      "description": "Invia notifica a sistema esterno",
      "created_by": "admin"
    }
  }'
```

## Metodo 2: Tramite File JSON (Sync Config)

### 1. Aggiungi il Workflow al File `config/demo/workflows.json`

```json
{
  "tenant_id": "demo",
  "workflows": [
    {
      "workflow_id": "my_custom_workflow",
      "tenant_id": "demo",
      "unit_id": "sales",
      "name": "My Custom Workflow",
      "type": "event",
      "enabled": true,
      "status": "active",
      "trigger": {
        "type": "event",
        "event": "entity.updated",
        "entity": "contact",
        "conditions": [
          {
            "field": "status",
            "operator": "==",
            "value": "active"
          }
        ]
      },
      "actions": [
        {
          "type": "update",
          "entity": "contact",
          "data": {
            "last_updated_by_workflow": "{{now}}"
          }
        }
      ],
      "chained_workflows": [],
      "metadata": {
        "created_by": "admin",
        "description": "Esempio di workflow personalizzato",
        "version": 1
      },
      "created_at": "2025-01-09T10:00:00Z",
      "updated_at": "2025-01-09T10:00:00Z"
    }
  ]
}
```

### 2. Sincronizza la Configurazione

```bash
npx tsx scripts/sync-config.ts demo
```

## Metodo 3: Tramite Frontend (Playground)

1. Vai su `/workflows` nel playground
2. Clicca su "Add Workflow"
3. Compila il form o usa la vista JSON
4. Clicca su "Create Workflow"

## Variabili Template Supportate

Nei campi `data` delle actions puoi usare:

- `{{context.entity_id}}` - ID dell'entità che ha triggerato il workflow
- `{{context.entity.name}}` - Campo name dell'entità
- `{{context.entity.field}}` - Qualsiasi campo dell'entità
- `{{today}}` - Data di oggi (YYYY-MM-DD)
- `{{today+7d}}` - Data di oggi + 7 giorni
- `{{today-1d}}` - Data di oggi - 1 giorno
- `{{now}}` - Timestamp corrente (ISO string)
- `{{context.tenant_id}}` - ID del tenant
- `{{context.unit_id}}` - ID dell'unit

## Operatori per le Condizioni

- `==` - Uguale
- `!=` - Diverso
- `>` - Maggiore
- `<` - Minore
- `>=` - Maggiore o uguale
- `<=` - Minore o uguale
- `contains` - Contiene (per stringhe)
- `in` - Contenuto in array
- `startsWith` - Inizia con
- `endsWith` - Finisce con
- `isEmpty` - Vuoto
- `isNotEmpty` - Non vuoto

## Tipi di Actions Disponibili

- `update` - Aggiorna un'entità esistente
- `create` - Crea una nuova entità
- `delete` - Elimina un'entità
- `webhook` - Chiama un webhook esterno
- `api_call` - Chiama un endpoint API interno
- `mcp_tool` - Esegue un tool MCP
- `notify` - Invia una notifica
- `chain` - Esegue un altro workflow in sequenza

## Esempio Completo con Tutte le Features

```json
{
  "name": "Workflow Completo",
  "type": "event",
  "enabled": true,
  "status": "active",
  "trigger": {
    "type": "event",
    "event": "entity.created",
    "entity": "opportunity",
    "conditions": [
      {
        "field": "value",
        "operator": ">",
        "value": 10000
      },
      {
        "field": "stage",
        "operator": "==",
        "value": "proposal"
      }
    ]
  },
  "actions": [
    {
      "type": "update",
      "entity": "opportunity",
      "data": {
        "priority": "high",
        "assigned_to": "sales_manager_1"
      }
    },
    {
      "type": "create",
      "entity": "task",
      "data": {
        "title": "Follow up opportunità: {{context.entity.title}}",
        "type": "follow_up",
        "due_date": "{{today+3d}}",
        "assigned_to": "{{context.entity.assigned_to}}"
      }
    },
    {
      "type": "notify",
      "to": "{{context.entity.assigned_to}}",
      "subject": "Nuova Opportunità Importante",
      "message": "È stata creata una nuova opportunità di valore {{context.entity.value}}"
    },
    {
      "type": "webhook",
      "webhook_url": "https://crm.example.com/webhooks/opportunity",
      "webhook_method": "POST",
      "data": {
        "opportunity_id": "{{context.entity_id}}",
        "value": "{{context.entity.value}}",
        "created_at": "{{now}}"
      }
    },
    {
      "type": "chain",
      "workflow_id": "send_welcome_email"
    }
  ],
  "chained_workflows": ["send_welcome_email", "create_initial_meeting"],
  "metadata": {
    "created_by": "admin",
    "description": "Workflow completo con tutte le features",
    "tags": ["sales", "high-value"],
    "version": 1
  }
}
```
