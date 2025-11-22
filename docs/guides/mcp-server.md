# MCP Server

Il MCP (Model Context Protocol) Server espone le funzionalità CRM come tools per AI assistants come Claude, GPT, ecc.

## Funzionalità

- **Tools dinamici**: Genera tools basati sulle entità configurate
- **CRUD operations**: Create, Read, Search per tutte le entità
- **Ricerca avanzata**: Supporta text, semantic e hybrid search

## Tools Generati

Per ogni entità configurata, vengono generati automaticamente:

- `create_{entity}`: Crea una nuova entità
- `search_{entity}`: Cerca entità (text/semantic/hybrid)
- `get_{entity}`: Ottieni entità per ID

Esempio per `contact`:

- `create_contact`
- `search_contact`
- `get_contact`

## Avvio

```bash
pnpm mcp
```

Il server comunica tramite stdio seguendo il protocollo MCP.

## Integrazione con AI Assistants

### Claude Desktop

Aggiungi al file di configurazione Claude:

```json
{
  "mcpServers": {
    "crm-atlas": {
      "command": "node",
      "args": ["/path/to/crm-atlas/dist/apps/mcp-server/src/main.js"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/crm_atlas",
        "MONGODB_DB_NAME": "crm_atlas"
      }
    }
  }
}
```

### Altri AI Assistants

Il server segue il protocollo MCP standard, quindi può essere integrato con qualsiasi client MCP-compatibile.

## Esempio di Utilizzo

Un AI assistant può ora:

1. **Cercare contatti**: "Trova tutti i contatti interessati al nostro prodotto"
2. **Creare entità**: "Crea un nuovo task per seguire il contatto X"
3. **Leggere dati**: "Mostrami i dettagli della company Y"

## Resources

Il server espone anche resources per accedere alle configurazioni:

- `crm://tenant/{tenant_id}`: Configurazione tenant completa

## Note

- Il server usa il primo tenant/unit disponibile come default
- In produzione, considera di aggiungere autenticazione/authorization
- I tools sono generati dinamicamente basati sulle configurazioni JSON

## Accesso Remoto

Per esporre il server MCP all'esterno e collegarlo ad applicazioni AI come Claude Desktop, vedi la [guida al server MCP remoto](./mcp-remote-server.md).

L'API già espone endpoint MCP che possono essere usati come server MCP remoto:

- `GET /api/{tenant}/{unit}/mcp/tools` - Lista tools
- `POST /api/{tenant}/{unit}/mcp/call-tool` - Esegue un tool

Questo permette di connettere Claude Desktop e altre applicazioni AI al tuo CRM senza dover eseguire il server MCP localmente.
