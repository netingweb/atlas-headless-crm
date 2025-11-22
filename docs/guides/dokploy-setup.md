# Dokploy Setup Guide

Questa guida ti aiuta a configurare CRM Atlas su Dokploy.

## Prerequisiti

- Server con Dokploy installato
- Accesso al repository GitHub
- Variabili d'ambiente configurate in Dokploy

## Configurazione in Dokploy

### 1. Creare una Nuova Applicazione

1. Vai su **Applications** → **New Application**
2. Seleziona **Docker Compose**
3. Configura:
   - **Name**: `crm-atlas-backend`
   - **Repository**: `https://github.com/netingweb/atlas-headless-crm.git`
   - **Branch**: `master`
   - **Docker Compose File**: `docker-compose.yml`

### 2. Configurare le Variabili d'Ambiente

In Dokploy, vai su **Environment Variables** e aggiungi:

#### Variabili Obbligatorie

```env
# JWT Security (IMPORTANTE: cambia in produzione!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# OpenAI API Key (se usi OpenAI per embeddings)
OPENAI_API_KEY=sk-your-openai-api-key

# O se usi Jina
EMBEDDINGS_PROVIDER=jina
JINA_API_KEY=your-jina-api-key
```

#### Variabili Opzionali

```env
# API Configuration
API_PORT=3000
API_HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://mongo:27017/crm_atlas
MONGODB_DB_NAME=crm_atlas

# Redis
REDIS_URL=redis://redis:6379

# Typesense
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=xyz

# Qdrant
QDRANT_URL=http://qdrant:6333

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Default Tenant
DEFAULT_TENANT=demo
DEFAULT_ADMIN_EMAIL=admin@demo.local
DEFAULT_ADMIN_PASSWORD=changeme
```

### 3. Configurare le Porte

**IMPORTANTE**: I servizi interni (MongoDB, Redis, Typesense, Qdrant, MinIO) **NON** espongono porte all'host. Comunicano solo nella rete Docker interna.

Solo l'API espone una porta:

- **Porta API**: Configura in Dokploy quale porta esporre per l'API (default: 3000)

### 4. Configurare il Reverse Proxy (Opzionale)

Se vuoi esporre l'API tramite dominio:

1. Vai su **Domains** nella tua applicazione Dokploy
2. Aggiungi il tuo dominio (es: `api.tuosito.com`)
3. Dokploy configurerà automaticamente il reverse proxy

### 5. Deploy

1. Clicca su **Deploy**
2. Dokploy clonerà il repository e costruirà l'immagine Docker
3. Attendi il completamento del build (può richiedere alcuni minuti)

### 6. Verificare il Deploy

Dopo il deploy, verifica che tutto funzioni:

```bash
# Health check
curl http://your-domain/api/health

# O se usi l'IP diretto
curl http://your-server-ip:3000/api/health
```

Risposta attesa:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "mongodb": "ok"
  }
}
```

## Post-Deploy: Seed del Database

Dopo il primo deploy, devi inizializzare il database:

1. **Opzione A: Via Dokploy Terminal**
   - Vai su **Terminal** nella tua applicazione
   - Esegui: `pnpm seed`

2. **Opzione B: Via Docker Exec**
   ```bash
   docker exec -it crm-atlas-api pnpm seed
   ```

Questo creerà:

- Tenant `demo`
- Utente admin: `admin@demo.local` / `changeme`

## Troubleshooting

### Porta già in uso

Se vedi errori come "port is already allocated":

- I servizi interni (MongoDB, Redis, ecc.) non devono esporre porte
- Solo l'API espone una porta
- Verifica che la porta dell'API non sia già in uso

### Build fallisce

Se il build Docker fallisce:

- Verifica che `pnpm-lock.yaml` sia committato nel repository
- Controlla i log di build in Dokploy per errori specifici

### API non si avvia

- Verifica le variabili d'ambiente in Dokploy
- Controlla i log dell'API: **Logs** → **api**
- Assicurati che tutti i servizi dipendenti siano healthy

### Database vuoto

- Esegui `pnpm seed` dopo il primo deploy
- Verifica che MongoDB sia healthy: `docker exec -it crm-atlas-mongo mongosh --eval "db.adminCommand('ping')"`

## Aggiornamenti

Per aggiornare l'applicazione:

1. Fai push delle modifiche su GitHub
2. In Dokploy, clicca su **Redeploy**
3. Dokploy ricostruirà l'immagine con le nuove modifiche

## Note Importanti

- **Sicurezza**: Cambia sempre `JWT_SECRET` in produzione!
- **API Keys**: Non committare mai API keys nel repository
- **Volumi**: I dati sono persistenti grazie ai volumi Docker
- **Backup**: Considera di fare backup regolari dei volumi
