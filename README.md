# CRM Atlas

Headless CRM multi-tenant, API-first, MCP-ready, open source.

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start services with Docker Compose
docker-compose up -d

# Run development
pnpm -w -r dev
```

## Project Structure

- `apps/` - Applications (API, MCP, Indexer, Workflow, Admin UI)
- `packages/` - Shared packages (core, config, auth, db, search, embeddings, etc.)
- `docs/` - Documentation (OpenAPI, guides, MCP manifests)

## Development

```bash
# Build all packages
pnpm build

# Lint all packages
pnpm lint
pnpm lint:fix

# Type check
pnpm typecheck

# Test with coverage
pnpm test:coverage
```

## License

MIT

