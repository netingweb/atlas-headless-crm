# Configurazione Dokploy vs Sviluppo Locale

## Differenze tra Dokploy e Sviluppo Locale

### Dokploy (Produzione)

- **Nessuna porta esposta** per servizi interni (MongoDB, Redis, Typesense, Qdrant, MinIO)
- Servizi comunicano solo nella rete Docker interna
- Solo l'API espone una porta (configurabile via `API_PORT`)

### Sviluppo Locale

- **Porte esposte** per accesso diretto ai servizi
- Utile per strumenti come MongoDB Compass, Redis CLI, ecc.

## Setup per Sviluppo Locale

### Opzione 1: Usa docker-compose.override.yml (Consigliato)

1. **Crea il file override**:

   ```bash
   cp docker-compose.override.yml.example docker-compose.override.yml
   ```

2. **Avvia i servizi**:
   ```bash
   pnpm docker:up
   ```

Il file `docker-compose.override.yml` viene automaticamente caricato da Docker Compose e sovrascrive le configurazioni del `docker-compose.yml` base, esponendo le porte per lo sviluppo locale.

**Nota**: Il file `docker-compose.override.yml` è in `.gitignore` e non viene committato.

### Opzione 2: Usa variabili d'ambiente

Puoi anche esporre le porte usando variabili d'ambiente, ma l'override è più semplice.

## Verifica

Dopo aver creato `docker-compose.override.yml`, verifica che le porte siano esposte:

```bash
# MongoDB
mongosh mongodb://localhost:27017/crm_atlas

# Redis
redis-cli -h localhost -p 6379

# Typesense
curl http://localhost:8108/health

# Qdrant
curl http://localhost:6333/health

# MinIO Console
open http://localhost:9001
```

## Per Dokploy

In Dokploy, **NON** creare `docker-compose.override.yml`. I servizi comunicheranno solo internamente, che è quello che vuoi in produzione.
