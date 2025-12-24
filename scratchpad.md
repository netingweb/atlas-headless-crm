# Scratchpad

## 2025-11-28 – Entity & Field Description Propagation

- Analizzato `@/enh.plan.md` e definito un piano di lavoro dettagliato: estendere gli schemi TypeScript/Zod (`packages/types/src/entities.ts`), aggiornare i loader/API/MCP server per propagare `description` e `mcp_description`, arricchire la configurazione demo e la documentazione.
- Implementate le modifiche: nuove proprietà opzionali nei tipi, aggiornamento delle descrizioni generate dai tool MCP e dei suggerimenti dei campi, schema Swagger esteso, demo config con esempi reali, guida dati aggiornata.
- Nessun test automatico eseguito (solo linting virtuale) – eventuali validazioni manuali consigliate su MCP server e endpoint `config`.
