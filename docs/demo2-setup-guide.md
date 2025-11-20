# Demo2 Automotive Tenant - Setup Guide

## Introduzione

Questo documento fornisce le istruzioni complete per configurare e utilizzare il tenant **demo2**, un esempio di CRM automotive con gestione vendita e service di veicoli.

Il tenant demo2 dimostra le funzionalità avanzate di Atlas CRM Headless, tra cui:

- Entità globali (scope: tenant) vs locali (scope: unit)
- Organizzazione multi-sede con dipartimenti
- Ruoli e permessi specifici per automotive
- Workflows automatizzati per il processo vendita/service

## Architettura

### Organizzazione

Demo2 rappresenta una catena di concessionarie auto con 3 sedi:

- **Milano**: milano_sales, milano_service
- **Roma**: roma_sales, roma_service
- **Torino**: torino_sales, torino_service

### Entità del Sistema

#### Global Entities (Scope: Tenant)

Condivise tra tutte le sedi:

- **product**: Catalogo veicoli (marca, modello, prezzo, km, fuel_type, ecc.)
- **contact**: Anagrafica contatti/clienti
- **company**: Anagrafica aziende clienti

#### Local Entities (Scope: Unit)

Specifiche di ogni sede:

- **task**: Attività e promemoria
- **note**: Note e annotazioni
- **deal**: Trattative di vendita
- **opportunity**: Opportunità di vendita
- **document**: Documenti (contratti, preventivi, ordini)
- **service_order**: Ordini di servizio/manutenzione

## Setup Iniziale

### 1. Prerequisiti

Assicurati di aver completato il setup base di Atlas CRM:

```bash
# Installa dipendenze
pnpm install

# Avvia servizi (MongoDB, Typesense, Qdrant)
docker-compose up -d

# Verifica che i servizi siano attivi
docker-compose ps
```

### 2. Sincronizza Configurazione Demo2

```bash
# Sincronizza tutte le configurazioni nel database
pnpm config:sync demo2
```

Questo comando carica nel database:

- Configurazione tenant (`config/demo2/tenant.json`)
- Units e struttura organizzativa (`config/demo2/units.json`)
- Definizioni entità (`config/demo2/entities.json`)
- Permessi e ruoli (`config/demo2/permissions.json`)
- Dizionari (`config/demo2/dictionary.json`)
- Tipi documento (`config/demo2/documents.json`)
- Workflows (`config/demo2/workflows.json`)
- Sharing policy (`config/demo2/sharing_policy.json`)
- MCP tools (`config/demo2/mcp.manifest.json`)

### 3. Crea Utenti di Test

```bash
# Crea utenti per tutti i ruoli
pnpm tsx scripts/seed-demo2-users.ts
```

Utenti creati:

- `admin@demo2.local` / `changeme` - Admin sistema
- `org_manager@demo2.local` / `password123` - Organization Manager
- `milan_sales_manager@demo2.local` / `password123` - Unit Manager Milano Sales
- `milan_service_manager@demo2.local` / `password123` - Unit Manager Milano Service
- `roma_sales_manager@demo2.local` / `password123` - Unit Manager Roma Sales
- `roma_service_manager@demo2.local` / `password123` - Unit Manager Roma Service
- `milan_sales_rep1@demo2.local` / `password123` - Sales Rep Milano
- `milan_sales_rep2@demo2.local` / `password123` - Sales Rep Milano
- `roma_sales_rep1@demo2.local` / `password123` - Sales Rep Roma
- `torino_sales_rep1@demo2.local` / `password123` - Sales Rep Torino
- `milan_service_rep1@demo2.local` / `password123` - Service Rep Milano
- `milan_service_rep2@demo2.local` / `password123` - Service Rep Milano
- `roma_service_rep1@demo2.local` / `password123` - Service Rep Roma
- `accounting@demo2.local` / `password123` - Accounting

### 4. Popola Dati di Test

```bash
# Crea 26 veicoli nel catalogo globale
pnpm tsx scripts/seed-demo2-products.ts

# Crea contatti, tasks, deals, notes di esempio
pnpm tsx scripts/seed-demo2-data.ts
```

### 5. Avvia le API

```bash
# Avvia API server
pnpm --filter @crm-atlas/api dev

# In un altro terminale, avvia Playground (opzionale)
pnpm --filter @crm-atlas/playground dev
```

## Utilizzo

### Test con Swagger UI

1. Apri browser: `http://localhost:3000/api/docs`
2. Click su "Authorize"
3. Login con credenziali:
   ```json
   {
     "email": "admin@demo2.local",
     "password": "changeme"
   }
   ```
4. Copia il token ricevuto
5. Inserisci nel campo Authorization: `Bearer <token>`

### Esempi di API Calls

#### 1. Ottenere tutti i prodotti (global entity)

```bash
# Da milano_sales
GET /api/demo2/milano_sales/entity/product

# Da roma_sales (stessi prodotti!)
GET /api/demo2/roma_sales/entity/product
```

#### 2. Ottenere tasks (local entity)

```bash
# Da milano_sales (solo tasks di milano_sales)
GET /api/demo2/milano_sales/entity/task

# Da roma_sales (solo tasks di roma_sales, diversi!)
GET /api/demo2/roma_sales/entity/task
```

#### 3. Cercare un veicolo (global search)

```bash
POST /api/demo2/milano_sales/search/text
Content-Type: application/json

{
  "q": "BMW",
  "entity": "product",
  "per_page": 10
}

# Stessa ricerca da roma_sales restituisce gli stessi risultati
POST /api/demo2/roma_sales/search/text
Content-Type: application/json

{
  "q": "BMW",
  "entity": "product",
  "per_page": 10
}
```

#### 4. Creare un nuovo contatto (global entity)

```bash
POST /api/demo2/milano_sales/entity/contact
Content-Type: application/json

{
  "first_name": "Paolo",
  "last_name": "Ferrari",
  "email": "paolo.ferrari@example.com",
  "phone": "+39 348 9876543",
  "contact_type": "privato",
  "contact_source": "web",
  "pipeline_stage": "lead"
}

# Questo contatto sarà visibile anche da roma_sales e torino_sales
```

#### 5. Creare una nuova trattativa (local entity)

```bash
POST /api/demo2/milano_sales/entity/deal
Content-Type: application/json

{
  "title": "Vendita Audi A4 a Paolo Ferrari",
  "description": "Trattativa per Audi A4 2.0 TDI",
  "contact_name": "Paolo Ferrari",
  "status": "in_trattativa",
  "amount": 44000,
  "start_date": "2025-11-20T12:00:00Z"
}

# Questa deal NON sarà visibile da roma_sales o torino_sales
```

### Test con Script Bash

```bash
# Esegui test automatizzato
./scripts/test-demo2-api.sh
```

Questo script testa:

- Login utente
- Fetch entità globali da unit diverse
- Fetch entità locali da unit diverse
- Search per entità globali
- Verifica correttezza separazione global/local

### Test con Playground

1. Apri browser: `http://localhost:5173`
2. Login con credenziali demo2
3. Utilizza AI Agent per interagire con il CRM:
   - "Mostrami tutti i veicoli BMW disponibili"
   - "Crea un nuovo contatto per un cliente interessato"
   - "Quali sono le mie trattative aperte?"
   - "Crea una nuova opportunità di vendita"

## MCP Tools Disponibili

Il tenant demo2 espone i seguenti MCP tools per AI assistants:

- **create_customer**: Crea nuovo contatto cliente
- **search_vehicles**: Cerca veicoli nel catalogo
- **create_deal**: Crea nuova trattativa
- **update_deal_status**: Aggiorna stato trattativa
- **get_deal_documents**: Recupera documenti trattativa
- **get_sales_pipeline**: Visualizza pipeline vendite
- **create_service_appointment**: Crea appuntamento service

### Configurazione MCP Server

File: `~/.config/claude/claude_desktop_config.json` (per Claude Desktop)

```json
{
  "mcpServers": {
    "crm-demo2": {
      "command": "node",
      "args": ["/path/to/crm-atlas/apps/mcp-server/dist/main.js"],
      "env": {
        "TENANT_ID": "demo2",
        "UNIT_ID": "milano_sales",
        "API_BASE_URL": "http://localhost:3000/api",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Workflows Automatizzati

Demo2 include 7 workflows preconfigurati:

1. **Qualifica nuovo lead**
   - Trigger: Creazione nuovo contatto
   - Azione: Crea task di qualifica

2. **Creazione deal da opportunity**
   - Trigger: Opportunity raggiunge stage "qualificato"
   - Azione: Crea deal automaticamente

3. **Follow-up preventivo scaduto**
   - Trigger: Scheduled (giornaliero)
   - Azione: Crea task follow-up per preventivi non seguiti

4. **Deal in negoziazione**
   - Trigger: Deal passa a "in_trattativa"
   - Azione: Notifica manager

5. **Deal chiusa venduta**
   - Trigger: Deal passa a "chiusa_vinta"
   - Azione: Crea ordine, notifica service

6. **Deal offerta rifiutata**
   - Trigger: Deal passa a "chiusa_persa"
   - Azione: Crea task follow-up dopo 30 giorni

7. **Reminder tagliando**
   - Trigger: Scheduled (settimanale)
   - Azione: Verifica veicoli che necessitano manutenzione

## Troubleshooting

### Problema: "Tenant not found"

**Soluzione**: Esegui `pnpm config:sync demo2`

### Problema: "No collections found"

**Soluzione**: Esegui i seed scripts per creare i dati

### Problema: "Authentication failed"

**Soluzione**: Verifica le credenziali e che gli utenti siano stati creati

### Problema: "Search returns no results"

**Soluzione**: Esegui indexing Typesense:

```bash
pnpm tsx apps/indexer/src/backfill.ts demo2
```

### Problema: "Different results from different units for global entities"

**Soluzione**: Verifica che l'entity abbia `scope: "tenant"` in `entities.json`

## Reset Tenant

Per resettare completamente il tenant demo2:

```bash
# Script di reset completo
pnpm tsx scripts/reset-demo2.ts

# Poi riesegui setup
pnpm config:sync demo2
pnpm tsx scripts/seed-demo2-users.ts
pnpm tsx scripts/seed-demo2-products.ts
pnpm tsx scripts/seed-demo2-data.ts
```

## Documentazione Aggiuntiva

- [Verification Report](./demo2-verification-report.md) - Report tecnico di verifica
- [Main README](../README.md) - Documentazione generale Atlas CRM
- [Configuration Guide](../config/README.md) - Guida configurazione tenant
- [API Documentation](http://localhost:3000/api/docs) - Swagger UI (con API attiva)

## Support

Per domande o problemi:

- GitHub Issues: https://github.com/yourusername/crm-atlas/issues
- Email: support@example.com

---

**Last Updated**: November 2025
**Version**: 0.1.0
**Author**: Luca Mainieri
