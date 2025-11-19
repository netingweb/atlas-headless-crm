# Guida: Come caricare documenti nel Playground

## ✅ Problema Risolto

Il problema del selector vuoto per i document types è stato risolto aggiungendo:

1. **Endpoint API**: `GET /api/:tenant/config/documents` per recuperare la configurazione
2. **Miglioramenti UI**: Indicatore di caricamento e messaggio se non ci sono document types

## 📋 Come Usare

### 1. Accedi a una Entità Esistente

- Vai su qualsiasi entità esistente (es. Contact, Company, Opportunity)
- Esempio: `/entities/contact/[id]` dove `[id]` è l'ID di un contatto esistente

### 2. Apri il Tab "Documents"

- Nella pagina di dettaglio dell'entità, clicca sul tab **"Documents"**
- Questo tab è visibile solo per entità esistenti (non per quelle nuove)

### 3. Seleziona il Tipo di Documento

- Nel componente di upload vedrai un dropdown **"Document Type"**
- Dovresti vedere i seguenti tipi (se configurati):
  - **Contract** - Per contratti (PDF)
  - **Technical Manual** - Per manuali tecnici (PDF, DOCX)
  - **Image Analysis** - Per immagini (tutte le immagini)
  - **Text Document** - Per documenti di testo (TXT, Markdown)

### 4. Carica i File

- Clicca su **"Choose Files"** e seleziona uno o più file
- I file selezionati appariranno nella lista sotto
- Clicca su **"Upload Documents"** per caricare

## 🔧 Risoluzione Problemi

### Se il selector è vuoto:

1. **Verifica che l'API sia in esecuzione**

   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Verifica che la configurazione sia sincronizzata**

   ```bash
   pnpm exec tsx scripts/sync-config.ts demo
   ```

3. **Verifica l'endpoint direttamente**

   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"tenant_id":"demo","email":"admin@demo.local","password":"changeme"}' \
     | jq -r '.token')

   curl -X GET "http://localhost:3000/api/demo/config/documents" \
     -H "Authorization: Bearer $TOKEN" | jq '.document_types'
   ```

4. **Riavvia l'API** se necessario

   ```bash
   # Ferma l'API corrente
   pkill -f "nest start"

   # Riavvia
   pnpm dev
   ```

### Se vedi "No document types configured":

- La configurazione `documents.json` potrebbe non essere sincronizzata
- Esegui: `pnpm exec tsx scripts/sync-config.ts demo`
- Verifica che `config/demo/documents.json` contenga i document types

## 📝 Note

- I document types vengono caricati automaticamente all'apertura del componente
- Se non ci sono document types configurati, vedrai un messaggio informativo
- Il componente mostra uno stato di caricamento mentre recupera la configurazione
- I documenti vengono automaticamente collegati all'entità corrente

## 🎯 Prossimi Passi

Dopo il caricamento:

- I documenti appaiono nella lista sotto il componente di upload
- Puoi scaricare i documenti cliccando su "Download"
- Puoi eliminare i documenti cliccando su "Delete"
- Lo stato di processing è visibile (pending, processing, completed, failed)
