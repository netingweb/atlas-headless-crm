# Agent Service Architecture

## Overview

The goal is to extract the AI agent runtime from the Playground frontend and place it inside a dedicated backend service (`apps/agent-service`). The new service consumes the MCP server as the single source of tools and exposes an HTTP API (REST + Server Sent Events) that any client can use, including the existing Playground UI.

```
Playground UI ─┐
               ├── REST (chat session bootstrap)
Other clients ─┘
                    ┌──────────────┐
                    │ Agent        │  ┌──────────┐
                    │ Service      │  │ MCP      │
                    │ (DeepAgents) │──│ Server   │
                    └──────────────┘  └──────────┘
                          │
                          └─ LLM providers / tracing backends
```

Key requirements:

- Keep MCP as the owner of tool manifests.
- Support multiple tenants and multiple agent profiles per tenant (orchestrator, specialist, sub-agents).
- Stream agent events via SSE to provide live feedback that the Playground can render in real-time.
- Allow optional observability/tracing configuration (LangSmith or similar) per tenant/agent via JSON config files.
- Surface standalone health/diagnostic endpoints so external clients can verify availability before connecting.

## Boundaries and responsibilities

| Component     | Responsibilities                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Playground UI | Authenticate the user, collect chat history/context, call the agent-service API, render SSE events.        |
| Agent Service | Resolve tenant/unit/agent configuration, build Deep Agents, orchestrate MCP tool usage, expose REST + SSE. |
| MCP Server    | Expose tool manifest + tool invocation endpoints; remains unchanged.                                       |

## Agent Service modules

1. **Config loader (`config/{tenant}/agents.json`)**
   - Each tenant gets an `agents.json` file that enumerates the available agents.
   - For every `agentId` the file stores:
     - `type`: `orchestrator`, `subagent`, or `standard`.
     - LLM provider, model name, temperature, etc.
     - Allowed/disallowed MCP tools.
     - Optional `tracing` block: `enabled`, `provider` (e.g. `langsmith`), `variables` (API key/project), `defaultTags` (tenant/unit/agent/environment).

2. **Agent registry**
   - Given `(tenantId, unitId, agentId)` loads the tenant config, validates that the agent exists, and instantiates a Deep Agent (via `deepagents`) with the declared settings.
   - Converts MCP tool manifests into LangChain `DynamicStructuredTool`s, applies allow/deny filters, and injects subagent definitions as additional Deep Agent nodes.

3. **MCP tools adapter**
   - Connects to the existing MCP server using tenant/unit credentials.
   - Caches the manifest per tenant/unit with a TTL to reduce load.
   - Converts MCP tool schemas to LangChain `DynamicStructuredTool` instances that Deep Agents can call.

4. **Session & streaming layer**
   - `POST /v1/agents/:agentId/chat`: starts a chat session, persists contextual metadata (tenant, unit, user, view context) and returns a `sessionId`.
   - `GET /v1/agents/:agentId/sessions/:sessionId/stream`: opens an SSE stream that emits structured events (`session_started`, `message`, `plan_step`, `tool_call`, `tool_result`, `subagent_call`, `tracing`, `error`, `done`). Each event is JSON encoded and can be consumed by the Playground or other clients.

5. **Security & multitenancy**
   - Incoming HTTP requests must include authenticated user info (shared session cookie or signed JWT) plus mandatory headers for `tenant_id` and `unit_id`.
   - The service validates that the tenant configuration exists and that the requested `agentId` is allowed for that tenant.
   - MCP client calls always propagate the tenant/unit identifiers to keep data isolated.

6. **Observability hooks**
   - During agent construction the registry inspects the optional `tracing` block:
     - If enabled and `provider === "langsmith"`, `TracingFactory` instantiates a LangSmith client using the variables resolved via `${env:*}` placeholders.
     - Default tags (`tenant:*`, `unit:*`, `agent:*`, `env:*`) and contextual metadata (view context, user metadata) are applied to every run.
   - The SSE stream surfaces the LangSmith run URL via a dedicated `tracing` event so the Playground can expose a deep link in the UI.
   - On the frontend the `agentLogger` records SSE counts, plan steps, tool calls, subagent invocations and optional trace URLs for later inspection in **Settings → Agent Observability**.

## Data contracts

### Tenant agent configuration (`config/demo/agents.json`)

```jsonc
{
  "agents": {
    "crm_orchestrator": {
      "type": "orchestrator",
      "description": "Assistente principale per il tenant demo.",
      "systemPrompt": "You are the orchestrator agent for the Demo tenant...",
      "llm": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.2,
        "apiKey": "${env:OPENAI_API_KEY}",
      },
      "tools": {
        "allow": ["*"],
      },
      "subagents": [
        {
          "agentId": "contact_specialist",
          "description": "Use for contact centric tasks.",
        },
      ],
      "tracing": {
        "provider": "langsmith",
        "enabled": false,
        "variables": {
          "LANGCHAIN_API_KEY": "${env:LANGCHAIN_API_KEY}",
          "LANGCHAIN_PROJECT": "crm-atlas-demo",
          "LANGSMITH_API_URL": "${env:LANGSMITH_API_URL}",
          "LANGSMITH_WEB_URL": "${env:LANGSMITH_WEB_URL}",
        },
        "defaultTags": ["tenant:demo", "env:local"],
        "metadata": {
          "environment": "demo",
        },
      },
    },
    "contact_specialist": {
      "type": "standard",
      "description": "Focalizzato su contatti e note.",
      "systemPrompt": "You specialize in contact level operations...",
      "llm": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.1,
        "apiKey": "${env:OPENAI_API_KEY}",
      },
      "tools": {
        "allow": [
          "search_contact",
          "get_contact",
          "create_contact",
          "update_contact",
          "delete_contact",
          "search_note",
          "create_note",
        ],
      },
    },
  },
}
```

### HTTP API

- `POST /v1/agents/:agentId/chat`
  - Body: `{ "messages": [...], "tenantId": "demo", "unitId": "sales", "viewContext": {...}, "metadata": {...} }`.
  - Response: `{ "sessionId": "sess_abc123" }`.
  - The endpoint enforces JWT-based tenant/unit authorization (see `AuthVerifier`).

- `GET /v1/agents/:agentId/sessions/:sessionId/stream?token=<jwt>`
  - Streaming endpoint returning SSE events (`event: message\ndata:{...}\n\n`).
  - Clients can pass the JWT either as `Authorization: Bearer ...` header or as `token` query string when running inside the browser (Playground).
  - Typical event sequence: `session_started` → `tracing` (optional) → multiple `message`/`plan_step`/`tool_call` events → `done` or `error`.

### Observability & tracing

- `TracingFactory` resolves the LangSmith client at runtime only if the agent definition enables tracing and the required env variables exist.
- Each run inherits:
  - default tags configured in the tenant JSON plus `tenant:*`, `unit:*`, `agent:*`.
  - metadata combining the agent definition and the conversation context (view context + user metadata).
- On success the `done` SSE includes the aggregated usage/final message that is also forwarded to LangSmith via `tracing.finalize({ finalMessage, usage })`.
- On failures the runtime emits `error` and calls `tracing.finalize(undefined, error)` to close the LangSmith run with the stack trace.
- The Playground persists the LangSmith URL in `agentLogger` (see `AgentObservabilityTab`) and surfaces a direct link per execution so operators can pivot from UI logs to LangSmith traces.

### Testing

- `apps/agent-service/src/services/agent-runtime.test.ts` exercises the multi-tenant execution flow, SSE emission order, tracing hooks and failure handling for tenants `demo`, `demo2`, `demo3`.
- Existing Jest suites (`auth-verifier.test.ts`, `agent-config-loader.test.ts`) ensure JWT enforcement and JSON config parsing remain stable across refactors.

## Deployment notes

- Add the new service to `docker-compose.yml` sharing the same `.env`/secret files as other backend apps.
- Provide health checks for readiness/liveness.
- Run `pnpm build` to include the service in the monorepo build matrix.
- For production, ensure LangSmith credentials are provided via environment variables or secret managers referenced in the tenant JSON config.
- Before deploying UI changes, run `pnpm --filter @crm-atlas/agent-service test -- --watchman=false` and `pnpm --filter @crm-atlas/playground lint` to validate the backend runtime and the Playground’s SSE/observability surfaces.
