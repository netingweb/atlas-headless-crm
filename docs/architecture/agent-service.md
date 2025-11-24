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
- Support multiple tenants and multiple agent profiles per tenant (orchestrator, specialist, etc.).
- Stream agent events via SSE to provide live feedback.
- Allow optional observability/tracing configuration (LangSmith or similar) per tenant/agent.

## Boundaries and responsibilities

| Component          | Responsibilities                                                                                             |
|--------------------|--------------------------------------------------------------------------------------------------------------|
| Playground UI      | Authenticate the user, collect chat history/context, call the agent-service API, render SSE events.          |
| Agent Service      | Resolve tenant/unit/agent configuration, build Deep Agents, orchestrate MCP tool usage, expose REST + SSE.   |
| MCP Server         | Expose tool manifest + tool invocation endpoints; remains unchanged.                                         |

## Agent Service modules

1. **Config loader (`config/{tenant}/agents.json`)**
   - Each tenant gets an `agents.json` file that enumerates the available agents.
   - For every `agentId` the file stores:
     - `type`: `orchestrator`, `subagent`, or `standard`.
     - LLM provider, model name, temperature, etc.
     - Allowed/disallowed MCP tools.
     - Optional `tracing` block: `enabled`, `provider` (e.g. `langsmith`), `variables` (API key/project), `defaultTags` (tenant/unit/agent/environment).

2. **Agent registry**
   - Given `(tenantId, agentId)` loads the tenant config, validates that the agent exists, and instantiates a Deep Agent with the declared settings.
   - Adds filesystem planning tools (`write_todos`, `ls/read_file/...`) if the agent requires them.
   - For orchestrator agents, automatically registers a `task` tool able to spin up subagents (also resolved via the same registry).

3. **MCP tools adapter**
   - Connects to the existing MCP server using tenant/unit credentials.
   - Caches the manifest per tenant/unit with a TTL to reduce load.
   - Converts MCP tool schemas to LangChain `DynamicStructuredTool` instances that Deep Agents can call.

4. **Session & streaming layer**
   - `POST /v1/agents/:agentId/chat`: starts a chat session, persists contextual metadata (tenant, unit, user, view context) and returns a `sessionId`.
   - `GET /v1/agents/:agentId/sessions/:sessionId/stream`: opens an SSE stream that emits structured events (`message`, `plan_step`, `tool_call`, `subagent_call`, `error`, `done`). Each event includes timestamps and optional tracing info (e.g. LangSmith run ID).
   - SSE payload example:
     ```json
     {
       "type": "plan_step",
       "step": 2,
       "status": "started",
       "content": "Call get_company to retrieve BMW"
     }
     ```

5. **Security & multitenancy**
   - Incoming HTTP requests must include authenticated user info (shared session cookie or signed JWT) plus mandatory headers for `tenant_id` and `unit_id`.
   - The service validates that the tenant configuration exists and that the requested `agentId` is allowed for that tenant.
   - MCP client calls always propagate the tenant/unit identifiers to keep data isolated.

6. **Observability hooks**
   - During agent construction, check the optional `tracing` block:
     - If enabled and `provider === "langsmith"`, configure LangChain tracing with the provided variables (`LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`, `LANGCHAIN_TRACING_V2=true`).
     - Apply default tags/metadata to each run (`tenant_id`, `unit_id`, `agentId`, `environment`, custom labels).
   - Surface tracing IDs back to clients via SSE events (`type: "tracing"`) so the UI can link to LangSmith dashboards.
   - Emit structured logs (JSON) for each plan step, tool call, and error together with latency metrics.

## Data contracts

### Tenant agent configuration (`config/demo/agents.json`)

```jsonc
{
  "agents": {
    "crm_orchestrator": {
      "type": "orchestrator",
      "llm": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.2
      },
      "tools": {
        "allow": ["search_contacts", "get_company", "create_task"],
        "deny": ["delete_contact"]
      },
      "tracing": {
        "provider": "langsmith",
        "enabled": true,
        "variables": {
          "LANGCHAIN_API_KEY": "${env:LANGCHAIN_API_KEY}",
          "LANGCHAIN_PROJECT": "crm-atlas-demo"
        },
        "defaultTags": ["tenant:demo", "agent:crm_orchestrator", "env:dev"]
      }
    }
  }
}
```

### HTTP API

- `POST /v1/agents/:agentId/chat`
  - Body: `{ "messages": [...], "tenantId": "demo", "unitId": "sales", "context": { "entityType": "contact", "entityId": "123" } }`
  - Response: `{ "sessionId": "sess_abc123" }`

- `GET /v1/agents/:agentId/sessions/:sessionId/stream`
  - Query params: `tenantId`, `unitId`.
  - SSE events with JSON payloads.

## Deployment notes

- Add the new service to `docker-compose.yml` sharing the same `.env`/secret files as other backend apps.
- Provide health checks for readiness/liveness.
- Run `pnpm build` to include the service in the monorepo build matrix.
- For production, ensure LangSmith credentials are provided via environment variables or secret managers referenced in the tenant JSON config.


