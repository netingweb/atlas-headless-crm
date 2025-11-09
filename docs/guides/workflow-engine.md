# Workflow Engine

Il Workflow Engine permette di automatizzare azioni CRM basate su eventi, schedule o trigger manuali.

## Funzionalità

- **Trigger basati su eventi**: Esegui workflow quando entità vengono create/aggiornate/eliminate
- **Trigger schedulati**: Esegui workflow su base cron
- **Trigger manuali**: Esegui workflow su richiesta
- **Action types**: update, create, notify, assign, webhook

## Configurazione Workflow

I workflow sono definiti in `config/{tenant_id}/workflows.json`:

```json
{
  "tenant_id": "demo",
  "workflows": [
    {
      "workflow_id": "followup_hot_contact",
      "trigger": {
        "type": "event",
        "event": "entity.updated",
        "entity": "contact",
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
          "type": "create",
          "entity": "task",
          "data": {
            "title": "Follow up hot contact",
            "type": "follow_up",
            "due_date": "2024-12-20"
          }
        },
        {
          "type": "assign",
          "entity": "contact",
          "to": "sales_manager_1"
        }
      ]
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

**Operatori supportati**: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `in`

### Scheduled Trigger

```json
{
  "type": "scheduled",
  "schedule": "0 9 * * *" // Cron expression
}
```

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
    "type": "call"
  }
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

Invia una notifica (placeholder per implementazione futura):

```json
{
  "type": "notify",
  "to": "user@example.com",
  "data": {
    "subject": "New hot lead",
    "body": "A new hot lead has been created"
  }
}
```

### Webhook

Chiama un webhook esterno:

```json
{
  "type": "webhook",
  "webhook_url": "https://example.com/webhook",
  "webhook_method": "POST",
  "data": {
    "custom_field": "value"
  }
}
```

## Avvio

```bash
pnpm workflow
```

## Integrazione con API

L'API emette eventi quando entità vengono create/aggiornate/eliminate. Il Workflow Engine può essere configurato per ascoltare questi eventi (richiede integrazione con EventEmitter2 o sistema di messaggistica).

## Note

- I workflow sono eseguiti in modo asincrono usando BullMQ
- Redis è richiesto per il queue system
- I workflow falliti vengono loggati ma non bloccano l'esecuzione
