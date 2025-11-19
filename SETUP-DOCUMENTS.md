# Setup e Test Document Management System

## ✅ Implementazione Completata

### Componenti Implementati

1. **Storage Package** (`packages/storage/`)
   - MinIO provider completo
   - S3 provider placeholder
   - Factory pattern

2. **Documents Package** (`packages/documents/`)
   - PDF processor
   - DOCX processor
   - Text processor
   - Image processor (con placeholder vision/OCR)
   - Chunking intelligente

3. **API Endpoints** (`apps/api/src/documents/`)
   - CRUD completo
   - Upload con Fastify multipart
   - Download file
   - Documenti collegati a entity

4. **Processing Queue** (`apps/api/src/documents/documents.worker.ts`)
   - Worker BullMQ
   - Estrazione testo
   - Embedding configurabile
   - Indexing

5. **Configurazione**
   - Entity `document` in entities.json
   - `documents.json` con document types
   - Permissions aggiornate
   - MinIO in docker-compose.yml

## 🔧 Setup Richiesto

### 1. Avviare Servizi Docker

```bash
docker-compose up -d
# Verificare che MinIO sia attivo
docker ps | grep minio
```

### 2. Sincronizzare Configurazione

```bash
pnpm exec tsx scripts/sync-config.ts demo
```

### 3. Creare Bucket MinIO (se necessario)

```bash
# MinIO console: http://localhost:9001
# Login: minioadmin / minioadmin
# Creare bucket "documents"
```

### 4. Avviare API

```bash
pnpm dev
# Oppure
pnpm --filter @crm-atlas/api dev
```

## 🧪 Test Rapido

### 1. Verifica Health

```bash
curl http://localhost:3000/api/health
```

### 2. Login e Upload

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"demo","email":"admin@demo.local","password":"changeme"}' \
  | jq -r '.token')

# Creare file test
echo "Test content" > /tmp/test.txt

# Upload
curl -X POST http://localhost:3000/api/demo/sales/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt" \
  -F "title=Test" \
  -F "document_type=technical_manual"
```

## ⚠️ Problemi Comuni

### API non si avvia

- Verificare che MongoDB, Redis, Typesense, Qdrant siano attivi
- Verificare che MinIO sia attivo
- Controllare errori nel terminale
- Verificare che tutti i package siano buildati: `pnpm build`

### Multipart plugin error

- Verificare che `@fastify/multipart` sia installato
- Il plugin viene registrato in `main.ts` con try/catch

### Storage errors

- Verificare configurazione MinIO in `tenant.json`
- Verificare che il bucket esista (viene creato automaticamente al primo upload)

### Processing queue non funziona

- Verificare che Redis sia attivo
- Il worker viene chiamato all'upload ma potrebbe richiedere inizializzazione separata

## 📝 Prossimi Passi

1. ✅ Testare upload documento
2. ✅ Verificare storage in MinIO
3. ✅ Verificare processing queue
4. ✅ Testare download documento
5. ✅ Verificare indexing in Typesense/Qdrant
6. ⏳ Implementare vision provider
7. ⏳ Implementare OCR
8. ⏳ Implementare MCP tools per documenti
9. ⏳ Implementare UI playground
