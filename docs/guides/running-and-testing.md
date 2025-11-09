# Guida: Eseguire e Testare il Progetto

## Prerequisiti

- **Docker** e **Docker Compose** installati
- **Node.js 20+** e **PNPM 8+** installati
- (Opzionale) **OpenAI API Key** o **Jina API Key** per la ricerca semantica

## Setup Iniziale

### 1. Installare le dipendenze

```bash
pnpm install
```

### 2. Configurare le variabili d'ambiente

```bash
# Copia il file di esempio
cp .env.example .env

# Modifica .env e aggiungi la tua API key (opzionale per test base)
# Per OpenAI:
OPENAI_API_KEY=sk-your-key-here

# Oppure per Jina:
EMBEDDINGS_PROVIDER=jina
JINA_API_KEY=your-jina-key
```

**Nota**: Per i test base (CRUD, auth) non è necessaria l'API key. Serve solo per la ricerca semantica.

## Avvio del Progetto

### Opzione A: Sviluppo Locale (Consigliato)

1. **Avvia solo i servizi esterni** (MongoDB, Redis, Typesense, Qdrant):

```bash
pnpm docker:up mongo redis typesense qdrant
```

2. **Seed del database** (crea tenant demo e utente admin):

```bash
pnpm seed
```

3. **Avvia l'API in modalità sviluppo** (con hot-reload):

```bash
pnpm dev
```

L'API sarà disponibile su: **http://localhost:3000**

### Opzione B: Docker Compose Completo

1. **Avvia tutti i servizi** (inclusa l'API):

```bash
pnpm docker:up
```

2. **Seed del database**:

```bash
pnpm seed:docker
```

L'API sarà disponibile su: **http://localhost:3000**

## Testare il Progetto

### 1. Verifica Health Check

```bash
curl http://localhost:3000/api/health
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

### 2. Login e Ottenere Token JWT

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "demo",
    "email": "admin@demo.local",
    "password": "changeme"
  }'
```

Risposta attesa:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Salva il token** per le richieste successive:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Creare un Lead

```bash
curl -X POST http://localhost:3000/api/demo/sales/lead \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "status": "new",
    "notes": "Interested in our product"
  }'
```

Risposta attesa:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "status": "new",
  "notes": "Interested in our product",
  "tenant_id": "demo",
  "unit_id": "sales",
  "ownership": {
    "owner_unit": "sales",
    "visible_to": []
  },
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. Leggere un Lead

```bash
# Sostituisci {id} con l'ID restituito dalla creazione
curl http://localhost:3000/api/demo/sales/lead/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Listare tutti i Lead

```bash
curl http://localhost:3000/api/demo/sales/lead \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Aggiornare un Lead

```bash
curl -X PUT http://localhost:3000/api/demo/sales/lead/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "contacted"
  }'
```

### 7. Ricerca Testuale (Typesense)

```bash
curl -X POST http://localhost:3000/api/demo/sales/search/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "q": "John",
    "entity": "lead",
    "per_page": 10
  }'
```

### 8. Ricerca Semantica (Qdrant + Embeddings)

**Nota**: Richiede una API key OpenAI o Jina configurata.

```bash
curl -X POST "http://localhost:3000/api/demo/sales/search/semantic?entity=lead&q=interested%20customer&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

## Documentazione API Interattiva

Accedi a **Swagger UI** per esplorare tutti gli endpoint:

```
http://localhost:3000/docs
```

Qui puoi:

- Vedere tutti gli endpoint disponibili
- Testare le API direttamente dal browser
- Vedere gli schemi di richiesta/risposta
- Ottenere esempi di codice

## Script Utili

```bash
# Verifica lo stato dei servizi Docker
pnpm docker:ps

# Visualizza i log
pnpm docker:logs

# Riavvia i servizi
pnpm docker:restart

# Ferma tutti i servizi
pnpm docker:down

# Ferma e rimuove i volumi (reset completo)
pnpm docker:clean
```

## Troubleshooting

### Problema: MongoDB non si connette

```bash
# Verifica che MongoDB sia in esecuzione
pnpm docker:ps

# Se non è in esecuzione, avvialo
pnpm docker:up mongo

# Verifica i log
pnpm docker:logs mongo
```

### Problema: Porta 3000 già in uso

Modifica `API_PORT` nel file `.env`:

```bash
API_PORT=3001
```

### Problema: Errore "Entity not found"

Assicurati di aver eseguito il seed:

```bash
pnpm seed
```

### Problema: Errore di autenticazione

Verifica che stai usando il token corretto:

```bash
# Riloggati per ottenere un nuovo token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "demo",
    "email": "admin@demo.local",
    "password": "changeme"
  }'
```

## Test Automatici

Esegui i test unitari:

```bash
# Tutti i test
pnpm test

# Test con coverage
pnpm test:coverage

# Test in watch mode (solo API)
pnpm test:watch
```

## Prossimi Passi

1. Esplora la documentazione OpenAPI su `/docs`
2. Crea nuove entità modificando la configurazione nel database
3. Implementa workflow personalizzati
4. Integra con sistemi esterni via webhook
