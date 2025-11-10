# Configurazione OpenAI API Key per Embeddings

Questa guida spiega come configurare la chiave API OpenAI per abilitare la ricerca semantica nel backend Atlas CRM Headless.

## Perché è necessaria?

La chiave API OpenAI è richiesta quando:

- Si utilizza la ricerca semantica (`semantic` o `hybrid`)
- Si utilizzano i tool MCP che eseguono ricerche semantiche
- Si indicizzano nuovi documenti con embeddings

**Nota**: La chiave API salvata nel frontend (Settings > AI Engine) è separata e viene usata solo per l'agente LangChain nel browser. Il backend richiede la propria chiave API per generare embeddings.

## Opzione 1: Variabile d'Ambiente (Consigliata per Open Source)

Questa è l'opzione più sicura perché:

- ✅ Non committa chiavi nel repository
- ✅ Ogni ambiente può avere la propria configurazione
- ✅ Facile da gestire in produzione

### Sviluppo Locale

1. **Crea il file `.env` nella root del progetto** (se non esiste già):

```bash
cp .env.example .env
```

2. **Aggiungi la tua chiave API OpenAI**:

```bash
# Apri .env e modifica questa riga:
OPENAI_API_KEY=sk-your-actual-api-key-here
```

3. **Verifica che il file `.env` sia nel `.gitignore`** (già configurato):

```bash
# Il file .env è già escluso dal git, quindi non verrà committato
```

4. **Riavvia l'API** per caricare le nuove variabili d'ambiente:

```bash
# Se stai usando Docker Compose
docker-compose restart api

# Se stai sviluppando localmente
pnpm --filter @crm-atlas/api dev
```

### Docker Compose

Se usi Docker Compose, puoi configurare la variabile d'ambiente in due modi:

#### Metodo 1: File `.env` (Consigliato)

1. Crea/modifica il file `.env` nella root del progetto:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

2. Avvia i servizi:

```bash
docker-compose up -d
```

Il `docker-compose.yml` legge automaticamente le variabili dal file `.env`.

#### Metodo 2: Variabile d'ambiente del sistema

```bash
export OPENAI_API_KEY=sk-your-actual-api-key-here
docker-compose up -d
```

### Produzione

In produzione, configura la variabile d'ambiente nel tuo sistema di deployment:

#### Docker

```bash
docker run -e OPENAI_API_KEY=sk-your-key crm-atlas-api
```

#### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openai-api-key
type: Opaque
stringData:
  OPENAI_API_KEY: sk-your-key
```

#### Vercel / Netlify / Altri PaaS

Configura la variabile d'ambiente tramite il pannello di controllo del provider.

## Opzione 2: Configurazione Tenant (Alternativa)

Puoi anche configurare la chiave API nel file di configurazione del tenant (`config/{tenant_id}/tenant.json`):

```json
{
  "tenant_id": "demo",
  "name": "Demo Tenant",
  "settings": {},
  "embeddingsProvider": {
    "name": "openai",
    "apiKey": "sk-your-key-here",
    "model": "text-embedding-3-small"
  }
}
```

**Nota**: Questa opzione è meno sicura per progetti open source perché la chiave verrebbe committata nel repository se non gestita correttamente.

## Verifica della Configurazione

Dopo aver configurato la chiave API, puoi verificare che funzioni:

1. **Testa la ricerca semantica**:

```bash
curl -X POST http://localhost:3000/api/demo/sales/search/semantic?entity=contact&q=interested+customer \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Verifica i log dell'API** - Non dovresti vedere errori come "OpenAI API key is required"

3. **Testa i tool MCP** - I tool che usano ricerca semantica dovrebbero funzionare correttamente

## Troubleshooting

### Errore: "OpenAI API key is required"

**Causa**: La variabile d'ambiente `OPENAI_API_KEY` non è configurata o non è accessibile al processo API.

**Soluzione**:

1. Verifica che il file `.env` esista e contenga `OPENAI_API_KEY=sk-...`
2. Verifica che il file `.env` sia nella root del progetto (stessa directory di `docker-compose.yml`)
3. Riavvia l'API dopo aver modificato `.env`
4. Verifica che la variabile sia caricata: `echo $OPENAI_API_KEY` (dovrebbe mostrare la chiave)

### La chiave funziona nel frontend ma non nel backend

**Causa**: Le chiavi API sono separate:

- Frontend: Usata per LangChain/OpenAI nel browser (salvata in localStorage)
- Backend: Usata per generare embeddings (variabile d'ambiente)

**Soluzione**: Configura `OPENAI_API_KEY` come variabile d'ambiente nel backend.

### Docker non legge le variabili d'ambiente

**Causa**: Il file `.env` non è nella directory corretta o Docker Compose non lo trova.

**Soluzione**:

1. Assicurati che `.env` sia nella stessa directory di `docker-compose.yml`
2. Verifica che il file non abbia spazi prima del `=`: `OPENAI_API_KEY=sk-...` (non `OPENAI_API_KEY = sk-...`)
3. Riavvia Docker Compose: `docker-compose down && docker-compose up -d`

## Sicurezza

⚠️ **IMPORTANTE**:

- **NON** committare mai file `.env` con chiavi API reali
- **NON** condividere mai le chiavi API in chat, email o documenti pubblici
- Usa variabili d'ambiente o secret management in produzione
- Ruota regolarmente le chiavi API

## Supporto

Per problemi o domande:

- Controlla i log dell'API: `docker-compose logs api`
- Verifica la configurazione: `docker-compose exec api env | grep OPENAI`
- Apri una issue su GitHub
