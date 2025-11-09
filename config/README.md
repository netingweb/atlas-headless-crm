# Configurazioni CRM Atlas

Questa directory contiene le configurazioni JSON-driven per ogni tenant.

## Struttura

```
config/
  {tenant_id}/
    tenant.json          # Configurazione generale del tenant
    units.json           # Elenco divisioni/unità
    entities.json        # Definizione entità e campi
    permissions.json     # Ruoli e ACL
    dictionary.json      # Dizionari di valori
    sharing_policy.json  # Regole di condivisione
    workflows.json       # Regole di automazione
    mcp.manifest.json    # Strumenti MCP per agenti AI
```

## Tenant Demo

Il tenant `demo` è preconfigurato con:

- **Unit**: sales, support
- **Entities**: lead, opportunity
- **Roles**: admin, sales_manager, sales_rep
- **Workflows**: followup_hot_lead

## Come modificare le configurazioni

1. Modifica i file JSON nella directory `config/{tenant_id}/`
2. Esegui lo script di sync per caricare le modifiche nel database:
   ```bash
   pnpm config:sync demo
   ```

## Sincronizzazione con MongoDB

Le configurazioni vengono caricate da MongoDB all'avvio dell'applicazione. Per sincronizzare i file JSON con il database, usa lo script di seed o crea un nuovo script di sync.

## Versionamento

I file JSON sono versionati in Git, permettendo di tracciare le modifiche alle configurazioni nel tempo.
