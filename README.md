# CRM Atlas

Headless CRM multi-tenant, API-first, MCP-ready, open source.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Start services (MongoDB, Redis, Typesense, Qdrant)
pnpm docker:up mongo redis typesense qdrant

# 4. Seed database (crea tenant demo e utente admin)
pnpm seed

# 5. Start API in development mode
pnpm dev
```

L'API sarà disponibile su **http://localhost:3000**

**Documentazione API**: http://localhost:3000/docs

Per una guida completa su come eseguire e testare il progetto, vedi [docs/guides/running-and-testing.md](docs/guides/running-and-testing.md)

## Project Structure

- `apps/` - Applications (API, MCP, Indexer, Workflow, Admin UI)
- `packages/` - Shared packages (core, config, auth, db, search, embeddings, etc.)
- `docs/` - Documentation (OpenAPI, guides, MCP manifests)

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start services with Docker Compose
pnpm docker:up

# Seed database
pnpm seed
```

### Development Scripts

```bash
# Start API in development mode (watch mode)
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint
pnpm lint:fix

# Format code with Prettier
pnpm format
pnpm format:check

# Type check
pnpm typecheck

# Run tests
pnpm test
pnpm test:coverage
pnpm test:watch

# Clean build artifacts
pnpm clean

# Seed database (local)
pnpm seed

# Seed database (Docker)
pnpm seed:docker
```

### Docker Commands

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs

# Restart services
pnpm docker:restart

# List running services
pnpm docker:ps

# Stop and remove volumes
pnpm docker:clean
```

### Quality Assurance

```bash
# Run full QA check (lint, typecheck, test, build)
pnpm qa
```

## License

MIT
