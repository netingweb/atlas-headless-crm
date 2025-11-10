# Analisi API nel Playground

## 📋 Panoramica

Il playground di Atlas CRM Headless utilizza un'architettura modulare per gestire le chiamate API. Tutte le API sono organizzate in moduli separati nella cartella `apps/playground/src/lib/api/` e vengono utilizzate attraverso React Query per la gestione dello stato e del caching.

## 🔐 Sistema di Permessi

**IMPORTANTE**: A partire dalla versione corrente, tutte le API sono protette da un sistema di permessi basato su ruoli e scopes. Le API disponibili nel playground vengono filtrate in base ai permessi dell'utente loggato.

### Backend: ScopesGuard

Il backend utilizza un `ScopesGuard` che:

- Verifica i permessi dell'utente usando `AclService`
- Controlla gli scopes richiesti tramite il decorator `@AuthScopes`
- Carica la configurazione dei permessi da MongoDB
- Restituisce errore 403 se l'utente non ha i permessi necessari

### Frontend: Filtraggio API

Il frontend utilizza il modulo `lib/api/permissions.ts` per:

- Verificare quali API sono disponibili per l'utente corrente
- Filtrare i pulsanti e le funzionalità UI in base ai permessi
- Mostrare messaggi informativi quando l'utente non ha i permessi necessari

### Scopes Disponibili

- `crm:read` - Permette di leggere entità e dati
- `crm:write` - Permette di creare e modificare entità
- `crm:delete` - Permette di eliminare entità

Gli scopes vengono assegnati agli utenti tramite:

1. **Scopes diretti** - Assegnati direttamente all'utente
2. **Ruoli** - Gli scopes vengono ereditati dai ruoli definiti in `permissions.json`

## 🏗️ Struttura delle API

### Client Base (`client.ts`)

Il client base utilizza **Axios** per tutte le chiamate HTTP e include:

- **Base URL**: Configurato tramite `VITE_API_URL` o default `http://localhost:3000/api`
- **Intercettori Request**: Aggiunge automaticamente il token di autenticazione da `localStorage`
- **Intercettori Response**: Gestisce errori 401 (logout automatico) e errori di rete

```typescript
// Configurazione base
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Intercettore per aggiungere token
this.client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Moduli API Disponibili

1. **`auth.ts`** - Autenticazione
2. **`config.ts`** - Configurazione (units, entities)
3. **`entities.ts`** - CRUD operazioni su entità
4. **`search.ts`** - Ricerca (global, text, semantic, hybrid)
5. **`stats.ts`** - Statistiche e metriche
6. **`indexing.ts`** - Operazioni di indicizzazione (Typesense/Qdrant)
7. **`mcp.ts`** - MCP Tools per AI agents

## 📦 Importazione e Utilizzo

### Pattern di Import

Tutte le API seguono un pattern consistente:

```typescript
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { entitiesApi } from '@/lib/api/entities';
// ... etc
```

### Utilizzo con React Query

Le API vengono utilizzate principalmente attraverso **React Query** (`@tanstack/react-query`) per:

- **Caching automatico**
- **Refetching automatico**
- **Gestione dello stato di loading/error**
- **Invalidazione delle query**

Esempio tipico:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['entities', tenantId, unitId, entityType],
  queryFn: () =>
    entitiesApi.list({
      tenant: tenantId || '',
      unit: unitId || '',
      entity: entityType || '',
    }),
  enabled: !!tenantId && !!unitId && !!entityType,
});
```

## 🔍 Dettaglio Utilizzo per Modulo

### 1. Auth API (`auth.ts`)

**Utilizzato in:**

- `pages/Login.tsx`

**Funzioni disponibili:**

- `login(data: LoginRequest)` - Autenticazione utente
- `getMe(token?: string)` - Recupera informazioni utente corrente

**Esempio di utilizzo:**

```typescript
// Login.tsx
const response = await authApi.login(formData);
setToken(response.token);
const user = await authApi.getMe(response.token);
setUser(user);
```

### 2. Config API (`config.ts`)

**Utilizzato in:**

- `pages/EntityDetail.tsx` - Per recuperare definizioni di entità
- `components/layout/TopBar.tsx` - Per recuperare units

**Funzioni disponibili:**

- `getUnits(tenant: string)` - Lista delle units
- `getEntities(tenant: string)` - Lista delle definizioni di entità
- `getEntity(tenant: string, entityName: string)` - Definizione singola entità

**Esempio di utilizzo:**

```typescript
// EntityDetail.tsx
const { data: entityDef } = useQuery({
  queryKey: ['entity-definition', tenantId, entityType],
  queryFn: async () => {
    await apiClient.get(`/${tenantId}/config/clear-cache`);
    return await configApi.getEntity(tenantId || '', entityType || '');
  },
  enabled: !!tenantId && !!entityType,
});
```

### 3. Entities API (`entities.ts`)

**Utilizzato in:**

- `pages/EntityList.tsx` - Lista entità
- `pages/EntityDetail.tsx` - CRUD operazioni
- `components/ai/ChatInterface.tsx` (indirettamente tramite MCP)

**Funzioni disponibili:**

- `list(params)` - Lista entità con paginazione
- `getById(tenant, unit, entity, id, populate)` - Recupera singola entità
- `create(tenant, unit, entity, data)` - Crea nuova entità
- `update(tenant, unit, entity, id, data)` - Aggiorna entità
- `delete(tenant, unit, entity, id)` - Elimina entità
- `getRelated(tenant, unit, entity, id, relatedEntity)` - Entità correlate

**Esempio di utilizzo:**

```typescript
// EntityList.tsx
const { data: entities } = useQuery({
  queryKey: ['entities', tenantId, unitId, entityType],
  queryFn: () =>
    entitiesApi.list({
      tenant: tenantId || '',
      unit: unitId || '',
      entity: entityType || '',
    }),
});

// EntityDetail.tsx - Create mutation
const createMutation = useMutation({
  mutationFn: (data: Record<string, unknown>) =>
    entitiesApi.create(tenantId || '', unitId || '', entityType || '', data),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['entity', tenantId, unitId, entityType] });
  },
});
```

### 4. Search API (`search.ts`)

**Utilizzato in:**

- `components/layout/TopBar.tsx` - Ricerca globale nella barra superiore

**Funzioni disponibili:**

- `global(tenant, unit, data)` - Ricerca globale su tutte le entità
- `text(tenant, unit, data)` - Ricerca testuale
- `semantic(tenant, unit, params)` - Ricerca semantica
- `hybrid(tenant, unit, data)` - Ricerca ibrida (testuale + semantica)

**Esempio di utilizzo:**

```typescript
// TopBar.tsx
const handleSearch = async (query: string) => {
  const results = await searchApi.global(tenantId, unitId, { q: query, limit: 5 });
  setSearchResults(results);
};
```

**Nota:** Attualmente solo `global` è utilizzato nel playground. Le altre funzioni (`text`, `semantic`, `hybrid`) sono disponibili ma non ancora integrate nell'UI.

### 5. Stats API (`stats.ts`)

**Utilizzato in:**

- `pages/Dashboard.tsx` - Visualizzazione statistiche e note recenti

**Funzioni disponibili:**

- `getStats(tenant, unit)` - Statistiche generali (contacts, companies, tasks, opportunities, notes)
- `getRecentNotes(tenant, unit, limit)` - Note recenti

**Esempio di utilizzo:**

```typescript
// Dashboard.tsx
const { data: stats } = useQuery({
  queryKey: ['stats', tenantId, unitId],
  queryFn: () => statsApi.getStats(tenantId || '', unitId || ''),
  enabled: !!tenantId && !!unitId,
  refetchInterval: 30000, // Refresh ogni 30 secondi
});
```

### 6. Indexing API (`indexing.ts`)

**Utilizzato in:**

- `components/settings/IndexingTab.tsx` - Gestione indicizzazione Typesense/Qdrant

**Funzioni disponibili:**

- `checkHealth(ctx)` - Verifica stato Typesense
- `getMetrics(ctx)` - Metriche indicizzazione (collections, documents)
- `triggerBackfill(ctx)` - Trigger backfill completo

**Esempio di utilizzo:**

```typescript
// IndexingTab.tsx
const { data: health } = useQuery({
  queryKey: ['indexing', 'health', tenantId, unitId],
  queryFn: () => indexingApi.checkHealth(ctx),
  enabled: !!ctx,
  refetchInterval: 30000,
});

const backfillMutation = useMutation({
  mutationFn: () => indexingApi.triggerBackfill(ctx),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['indexing', 'metrics'] });
  },
});
```

### 7. MCP API (`mcp.ts`)

**Utilizzato in:**

- `components/settings/MCPToolsTab.tsx` - Lista e gestione MCP tools
- `lib/ai/agent.ts` - Chiamata tools durante esecuzione agent

**Funzioni disponibili:**

- `listTools(tenant, unit)` - Lista tutti i MCP tools disponibili
- `callTool(tenant, unit, toolName, args)` - Esegue chiamata a un tool MCP

**Esempio di utilizzo:**

```typescript
// MCPToolsTab.tsx
const { data: tools } = useQuery({
  queryKey: ['mcpTools', tenantId, unitId],
  queryFn: () => mcpApi.listTools(tenantId || '', unitId || ''),
  enabled: !!tenantId && !!unitId,
});

// agent.ts - Durante esecuzione agent
const result = await mcpApi.callTool(ctx.tenant_id, ctx.unit_id, toolName, args);
```

## 🧪 Testing delle API

### Pattern di Testing

Le API vengono testate principalmente attraverso:

1. **Testing Manuale nell'UI:**
   - Login/Logout
   - CRUD operazioni su entità
   - Ricerca globale
   - Visualizzazione statistiche
   - Gestione indicizzazione
   - Utilizzo MCP tools tramite AI agent

2. **React Query DevTools:**
   - Inspect delle query attive
   - Verifica cache e stato
   - Debugging delle mutazioni

3. **Console Logging:**
   - Log dettagliati in `mcp.ts` per debugging tool calls
   - Log in `agent.ts` per debugging agent execution

### Gestione Errori

Tutti i moduli API gestiscono errori in modo consistente:

```typescript
try {
  const response = await apiClient.post(...);
  return response.data;
} catch (error) {
  console.error('API Error:', error);
  // Error handling specifico per ogni modulo
  throw error;
}
```

Il client base gestisce:

- **401 Unauthorized**: Logout automatico e redirect a `/login`
- **Network errors**: Messaggi di errore chiari
- **Response errors**: Propagazione degli errori con dettagli

## 📊 Copertura API nel Playground

### API Utilizzate Attivamente ✅

| API              | Modulo        | Utilizzo | Pagina/Componente                    |
| ---------------- | ------------- | -------- | ------------------------------------ |
| Login            | `auth.ts`     | ✅       | `Login.tsx`                          |
| Get Me           | `auth.ts`     | ✅       | `Login.tsx`                          |
| Get Units        | `config.ts`   | ✅       | `TopBar.tsx`                         |
| Get Entities     | `config.ts`   | ✅       | `EntityDetail.tsx`                   |
| Get Entity       | `config.ts`   | ✅       | `EntityDetail.tsx`                   |
| List Entities    | `entities.ts` | ✅       | `EntityList.tsx`, `EntityDetail.tsx` |
| Get Entity By ID | `entities.ts` | ✅       | `EntityDetail.tsx`                   |
| Create Entity    | `entities.ts` | ✅       | `EntityDetail.tsx`                   |
| Update Entity    | `entities.ts` | ✅       | `EntityDetail.tsx`                   |
| Delete Entity    | `entities.ts` | ⚠️       | Non utilizzato direttamente nell'UI  |
| Get Related      | `entities.ts` | ⚠️       | Non utilizzato nell'UI               |
| Global Search    | `search.ts`   | ✅       | `TopBar.tsx`                         |
| Text Search      | `search.ts`   | ❌       | Disponibile ma non utilizzato        |
| Semantic Search  | `search.ts`   | ❌       | Disponibile ma non utilizzato        |
| Hybrid Search    | `search.ts`   | ❌       | Disponibile ma non utilizzato        |
| Get Stats        | `stats.ts`    | ✅       | `Dashboard.tsx`                      |
| Get Recent Notes | `stats.ts`    | ✅       | `Dashboard.tsx`                      |
| Check Health     | `indexing.ts` | ✅       | `IndexingTab.tsx`                    |
| Get Metrics      | `indexing.ts` | ✅       | `IndexingTab.tsx`                    |
| Trigger Backfill | `indexing.ts` | ✅       | `IndexingTab.tsx`                    |
| List MCP Tools   | `mcp.ts`      | ✅       | `MCPToolsTab.tsx`, `agent.ts`        |
| Call MCP Tool    | `mcp.ts`      | ✅       | `agent.ts`                           |

### API Non Utilizzate nell'UI ❌

1. **Search API avanzate:**
   - `text()` - Ricerca testuale
   - `semantic()` - Ricerca semantica
   - `hybrid()` - Ricerca ibrida

2. **Entities API:**
   - `delete()` - Eliminazione entità (non esposta nell'UI)
   - `getRelated()` - Entità correlate (non utilizzato)

## 🔄 Flusso di Dati

### Autenticazione

```
Login.tsx → authApi.login() → API → Token → localStorage → Interceptor → Tutte le chiamate successive
```

### CRUD Entità

```
EntityDetail.tsx → entitiesApi.create/update() → API → MongoDB → Typesense/Qdrant → Invalidate Query → Refresh UI
```

### Ricerca

```
TopBar.tsx → searchApi.global() → API → Typesense → Results → UI
```

### AI Agent

```
ChatInterface.tsx → agent.ts → mcpApi.listTools() → mcpApi.callTool() → API → MongoDB → Response → Agent → UI
```

## 🎯 Best Practices Implementate

1. **Separation of Concerns**: Ogni modulo API gestisce un dominio specifico
2. **Type Safety**: Tutte le API hanno interfacce TypeScript definite
3. **Error Handling**: Gestione errori consistente in tutti i moduli
4. **React Query**: Utilizzo di React Query per caching e stato
5. **Token Management**: Gestione automatica del token tramite interceptor
6. **Query Invalidation**: Invalidazione automatica dopo mutazioni
7. **Loading States**: Gestione stati di loading/error in tutti i componenti

## 🔐 Implementazione Permessi

### Backend

**ScopesGuard** (`packages/auth/src/guards.ts`):

- Verifica i permessi usando `AclService` e `MongoConfigLoader`
- Controlla gli scopes richiesti dal decorator `@AuthScopes`
- Applicato a tutti i controller API

**Controller Protetti**:

- `EntitiesController` - CRUD operazioni con scopes appropriati
- `SearchController` - Tutte le ricerche richiedono `crm:read`
- `StatsController` - Statistiche richiedono `crm:read`
- `IndexingController` - Health/metrics: `crm:read`, Backfill: `crm:write`
- `MCPController` - List tools: `crm:read`, Call tool: `crm:write|read|delete`

### Frontend

**Utility Permissions** (`lib/api/permissions.ts`):

- `isApiAvailable()` - Verifica se un'API è disponibile per l'utente
- `hasScope()` - Verifica se l'utente ha uno scope specifico
- `hasAnyScope()` - Verifica se l'utente ha almeno uno degli scopes richiesti
- `getAvailableApis()` - Restituisce tutte le API disponibili per l'utente

**Componenti Aggiornati**:

- `EntityList` - Nasconde pulsante "Create" se l'utente non ha `crm:write`
- `EntityDetail` - Disabilita pulsanti Create/Update se l'utente non ha i permessi
- Mostra messaggi informativi quando i permessi non sono sufficienti

**API Permissions** (`lib/api/config.ts`):

- `getPermissions()` - Recupera la configurazione dei permessi dal backend

## 🚀 Miglioramenti Suggeriti

1. **Aggiungere UI per Search avanzate**: Implementare interfaccia per text/semantic/hybrid search
2. **Aggiungere Delete nell'UI**: Implementare pulsante delete nelle liste entità (ora protetto da permessi)
3. **Aggiungere Related Entities**: Visualizzare entità correlate nella pagina di dettaglio
4. **Error Boundaries**: Aggiungere React Error Boundaries per gestione errori globale
5. **Retry Logic**: Configurare retry logic più sofisticata per chiamate fallite
6. **Optimistic Updates**: Implementare optimistic updates per migliorare UX
7. **Visualizzazione Permessi**: Aggiungere una pagina per visualizzare i permessi dell'utente corrente

## 📝 Note Tecniche

- **Base URL**: Configurato tramite env variable `VITE_API_URL`
- **Timeout**: 10 secondi per tutte le chiamate
- **CORS**: Configurato lato API (non gestito nel playground)
- **Token Storage**: `localStorage` con chiave `auth_token`
- **Query Client**: Configurato con `refetchOnWindowFocus: false` e `retry: 1`
