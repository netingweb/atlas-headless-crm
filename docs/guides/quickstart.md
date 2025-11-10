# Quick Start Guide

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ and PNPM 8+

## Fast Deploy (< 5 minutes)

1. Clone the repository:

```bash
git clone <repo-url>
cd atlas-headless-crm
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Edit `.env` and set your API keys (OpenAI or Jina):

```bash
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important**: The `OPENAI_API_KEY` is required for semantic search functionality.
See [OpenAI Setup Guide](openai-setup.md) for detailed configuration instructions.

4. Start all services:

```bash
docker-compose up -d
```

5. Seed the database:

```bash
docker-compose exec api pnpm seed
```

6. Access the API:

- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/docs
- Health Check: http://localhost:3000/api/health

## First Request

Login to get a JWT token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "demo",
    "email": "admin@demo.local",
    "password": "changeme"
  }'
```

Use the token to create a lead:

```bash
curl -X POST http://localhost:3000/api/demo/sales/lead \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "status": "new"
  }'
```

## Development

```bash
# Install dependencies
pnpm install

# Start services (Mongo, Redis, Typesense, Qdrant)
docker-compose up -d mongo redis typesense qdrant

# Run API in development mode
pnpm --filter @crm-atlas/api dev
```
