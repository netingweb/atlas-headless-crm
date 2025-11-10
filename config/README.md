# Configurazioni Atlas CRM Headless

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
2. **IMPORTANTE**: Esegui sempre lo script di sync per applicare le modifiche:
   ```bash
   pnpm config:sync demo
   ```

## ⚠️ Sincronizzazione Obbligatoria

**Ogni volta che modifichi le configurazioni, devi eseguire la sincronizzazione!**

Le configurazioni vengono caricate da MongoDB all'avvio dell'applicazione. Le modifiche ai file JSON **non vengono applicate automaticamente** - devi sincronizzarle manualmente.

### Quando sincronizzare

Esegui `pnpm config:sync` dopo aver modificato:

- ✅ **entities.json** - Aggiunta/modifica/rimozione di entità o campi
- ✅ **tenant.json** - Modifiche alla configurazione del tenant
- ✅ **units.json** - Aggiunta/modifica di unità
- ✅ **permissions.json** - Modifiche a ruoli e permessi
- ✅ **dictionary.json** - Modifiche ai dizionari
- ✅ **sharing_policy.json** - Modifiche alle regole di condivisione
- ✅ **workflows.json** - Modifiche ai workflow
- ✅ **mcp.manifest.json** - Modifiche al manifest MCP

### Comando di sincronizzazione

```bash
# Sincronizza il tenant demo
pnpm config:sync demo

# Oppure specifica un tenant diverso
pnpm config:sync <tenant_id>
```

### Cosa fa la sincronizzazione

Lo script `config:sync`:

1. Legge tutti i file JSON dalla directory `config/{tenant_id}/`
2. Sincronizza le configurazioni nel database MongoDB
3. Sostituisce completamente le configurazioni esistenti (upsert)
4. L'API ricaricherà le nuove configurazioni al prossimo accesso (o dopo aver pulito la cache)

### Pulizia cache API (opzionale)

Dopo la sincronizzazione, puoi pulire la cache dell'API per forzare il ricaricamento immediato:

```bash
# Via API (richiede autenticazione)
curl -X GET "http://localhost:3000/api/demo/config/clear-cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Oppure riavvia l'API per ricaricare le configurazioni.

## Versionamento

I file JSON sono versionati in Git, permettendo di tracciare le modifiche alle configurazioni nel tempo.
