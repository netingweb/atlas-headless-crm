# Test Document Management System

## ✅ Implementazione Completata

### Packages Creati

- ✅ `packages/storage/` - Storage abstraction (MinIO + S3 placeholder)
- ✅ `packages/documents/` - Document processor (PDF, DOCX, TXT, immagini)

### API Endpoints Implementati

- ✅ `POST /api/:tenant/:unit/documents` - Upload document
- ✅ `GET /api/:tenant/:unit/documents` - List documents
- ✅ `GET /api/:tenant/:unit/documents/:id` - Get document
- ✅ `GET /api/:tenant/:unit/documents/:id/download` - Download file
- ✅ `PUT /api/:tenant/:unit/documents/:id` - Update metadata
- ✅ `DELETE /api/:tenant/:unit/documents/:id` - Delete document
- ✅ `GET /api/:tenant/:unit/documents/entities/:entity/:id` - Get documents for entity

### Configurazione

- ✅ Entity `document` aggiunta in `entities.json`
- ✅ Permissions `documents:read/write/delete` aggiunte
- ✅ `documents.json` creato con document types configurabili
- ✅ `tenant.json` aggiornato con storage, vision, processing config
- ✅ MinIO aggiunto a `docker-compose.yml`

### Processing Queue

- ✅ Worker BullMQ per processing asincrono
- ✅ Estrazione testo da PDF, DOCX, TXT
- ✅ Supporto immagini con vision LLM (placeholder)
- ✅ Embedding configurabile per tipo documento
- ✅ Indexing in Typesense e Qdrant

## 🧪 Come Testare

### 1. Avviare i Servizi

```bash
# Avviare tutti i servizi Docker
docker-compose up -d

# Verificare che MinIO sia attivo
docker ps | grep minio

# Sincronizzare configurazione
pnpm exec tsx scripts/sync-config.ts demo
```

### 2. Avviare l'API

```bash
# In un terminale separato
pnpm dev
```

### 3. Test Manuale con cURL

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"demo","email":"admin@demo.local","password":"changeme"}' \
  | jq -r '.token')

# 2. Creare un file di test
echo "Test document content" > /tmp/test.txt

# 3. Upload documento
curl -X POST http://localhost:3000/api/demo/sales/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt" \
  -F "title=Test Document" \
  -F "document_type=technical_manual"

# 4. Lista documenti
curl http://localhost:3000/api/demo/sales/documents \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. Download documento (sostituire DOCUMENT_ID)
curl http://localhost:3000/api/demo/sales/documents/DOCUMENT_ID/download \
  -H "Authorization: Bearer $TOKEN" -o /tmp/downloaded.txt
```

### 4. Test con Script

```bash
# Eseguire lo script di test
./test-documents.sh
```

## 📋 Checklist Test

- [ ] MinIO è attivo e accessibile
- [ ] Configurazione sincronizzata (documents.json incluso)
- [ ] API risponde su http://localhost:3000/api/health
- [ ] Login funziona
- [ ] Upload documento funziona
- [ ] Lista documenti funziona
- [ ] Download documento funziona
- [ ] Update metadata funziona
- [ ] Delete documento funziona
- [ ] Documenti collegati a entity funziona
- [ ] Processing queue funziona (verificare status documenti)

## 🔍 Verifiche da Fare

1. **Storage**: Verificare che i file vengano salvati in MinIO
   - Accesso MinIO console: http://localhost:9001
   - Credenziali: minioadmin / minioadmin

2. **Processing Queue**: Verificare che i documenti vengano processati
   - Controllare `processing_status` nei documenti
   - Verificare che `extracted_content` sia popolato
   - Verificare indexing in Typesense/Qdrant

3. **Configurazione**: Verificare che document types siano caricati
   - Controllare MongoDB collection `documents_config`
   - Verificare validazione mime types e max size

## ⚠️ Note

- Il vision provider per immagini è ancora un placeholder
- L'OCR per immagini è ancora un placeholder
- Il processing queue worker deve essere avviato separatamente o integrato nel modulo
- MinIO bucket deve essere creato manualmente o tramite inizializzazione

## 🐛 Problemi Noti

- L'API potrebbe richiedere un riavvio dopo l'aggiunta del modulo documents
- Il multipart plugin potrebbe richiedere configurazione aggiuntiva
- Il worker processing deve essere inizializzato (attualmente viene chiamato solo al upload)
