# Indexer Service

L'Indexer Service sincronizza automaticamente i dati da MongoDB a Typesense e Qdrant utilizzando MongoDB Change Streams.

## Funzionalità

- **Change Streams**: Monitora tutte le modifiche ai documenti MongoDB in tempo reale
- **Sincronizzazione automatica**: Indica automaticamente nuovi/aggiornati documenti in Typesense e Qdrant
- **Backfill**: Script per indicizzare dati esistenti

## Avvio

```bash
# Avvia l'indexer
pnpm indexer

# Esegui backfill per dati esistenti
pnpm indexer:backfill
```

## Come funziona

1. L'indexer si connette a MongoDB e carica tutte le configurazioni tenant/unit/entity
2. Per ogni collection, avvia un Change Stream che monitora:
   - `insert`: Nuovi documenti
   - `update`: Documenti aggiornati
   - `delete`: Documenti eliminati
3. Per ogni evento:
   - **Insert/Update**: Indica il documento in Typesense e Qdrant (se ha campi embeddable)
   - **Delete**: Rimuove il documento dagli indici

## Configurazione

L'indexer usa le stesse variabili d'ambiente dell'API:

- `MONGODB_URI`: URI di connessione MongoDB
- `MONGODB_DB_NAME`: Nome database
- `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_API_KEY`: Configurazione Typesense
- `QDRANT_URL`: URL Qdrant
- `EMBEDDINGS_PROVIDER`, `OPENAI_API_KEY`, `JINA_API_KEY`: Provider embeddings

## Note

- L'indexer deve essere eseguito come servizio separato
- In produzione, considera di eseguirlo come servizio Docker o systemd
- Il backfill può richiedere tempo per grandi volumi di dati
