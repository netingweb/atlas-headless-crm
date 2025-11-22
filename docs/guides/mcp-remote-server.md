# MCP Server Remoto - Accesso Esterno

Questa guida spiega come esporre i server MCP all'esterno per collegarli ad applicazioni AI come Claude Desktop.

## 🎯 Soluzione: Usa l'API come Server MCP Remoto

L'API già espone endpoint MCP che possono essere usati come server MCP remoto:

- `GET /api/{tenant}/{unit}/mcp/tools` - Lista tutti i tools disponibili
- `POST /api/{tenant}/{unit}/mcp/call-tool` - Esegue un tool MCP

## 🔧 Configurazione per Claude Desktop

### Opzione 1: Connessione Diretta all'API (REST API)

Claude Desktop può connettersi all'API usando HTTP. Configura il file `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "crm-atlas": {
      "type": "http",
      "url": "http://localhost:3000/api/demo/sales/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

**Per accesso remoto** (da un altro computer o server):

```json
{
  "mcpServers": {
    "crm-atlas": {
      "type": "http",
      "url": "https://your-server.com/api/demo/sales/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN"
      }
    }
  }
}
```

### Opzione 2: Usa il Server MCP Standalone (Stdio)

Per uso locale, puoi ancora usare il server MCP stdio:

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

## 🔐 Autenticazione

### Ottenere un JWT Token

1. **Login tramite API**:

   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@demo.local",
       "password": "changeme"
     }'
   ```

2. **Usa il token** nel header `Authorization: Bearer <token>`

### Creare un API Key (Alternativa)

Puoi anche creare un API Key per l'accesso MCP:

```bash
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Server Key",
    "scopes": ["crm:read", "crm:write", "crm:delete"]
  }'
```

Usa l'API Key generata nel formato: `Authorization: Bearer crm_<prefix>_<secret>`

## 🌐 Esposizione Esterna

### Sviluppo Locale

Con `docker-compose.override.yml`, l'API è già esposta su `localhost:3000`.

### Produzione (Dokploy)

1. **L'API è già esposta** sulla porta configurata (default: 3000)
2. **Configura un reverse proxy** (nginx, traefik) per HTTPS
3. **Usa HTTPS** per sicurezza: `https://your-domain.com/api/{tenant}/{unit}/mcp`

### Esempio con Nginx

```nginx
server {
    listen 443 ssl;
    server_name mcp.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Authorization $http_authorization;
    }
}
```

## 📝 Esempio di Configurazione Completa

### Configurazione Claude Desktop per Server Remoto

```json
{
  "mcpServers": {
    "crm-atlas-demo": {
      "type": "http",
      "url": "https://api.yourdomain.com/api/demo/sales/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN_OR_API_KEY"
      },
      "description": "CRM Atlas - Demo Tenant"
    },
    "crm-atlas-demo2": {
      "type": "http",
      "url": "https://api.yourdomain.com/api/demo2/milano_sales/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN_OR_API_KEY"
      },
      "description": "CRM Atlas - Demo2 Tenant (Milano Sales)"
    }
  }
}
```

## 🔍 Verifica della Connessione

### Test Endpoint Tools

```bash
curl -X GET http://localhost:3000/api/demo/sales/mcp/tools \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Call Tool

```bash
curl -X POST http://localhost:3000/api/demo/sales/mcp/call-tool \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_contact",
    "arguments": {
      "query": "test",
      "limit": 5
    }
  }'
```

## ⚠️ Note di Sicurezza

1. **Usa HTTPS in produzione** - Non esporre mai l'API su HTTP in produzione
2. **Limita gli scope** - Crea API Key con solo gli scope necessari
3. **Rotazione dei token** - Cambia regolarmente i token JWT e API Key
4. **Rate limiting** - Configura rate limiting sul reverse proxy
5. **Firewall** - Limita l'accesso solo agli IP autorizzati se possibile

## 🚀 Prossimi Passi

1. Configura l'API su un server accessibile pubblicamente
2. Configura HTTPS con un reverse proxy
3. Crea un API Key dedicato per MCP
4. Configura Claude Desktop con l'URL del server remoto
5. Testa la connessione e verifica che i tools funzionino

## 📚 Riferimenti

- [Documentazione MCP](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Setup](https://docs.claude.com/claude-code/mcp)
- [API Documentation](./api-keys-security.md)
