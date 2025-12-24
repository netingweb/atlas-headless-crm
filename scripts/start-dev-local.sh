#!/bin/bash

# Script per avviare l'ambiente di sviluppo locale
# Questo script ferma i container API/Agent-Service Docker e avvia le app dev locali

set -e

echo "🛑 Stopping Docker API and Agent Service containers..."
docker compose stop api agent-service 2>/dev/null || true

echo "✅ Docker databases running (MongoDB, Redis, Typesense, Qdrant, MinIO)"
echo "🚀 Starting local development environment..."

# Kill any process on port 3000 (except Docker)
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Build required packages
echo "📦 Building required packages..."
pnpm -w -r --filter @crm-atlas/utils --filter @crm-atlas/embeddings --filter @crm-atlas/search build

# Start dev environment
echo "🎯 Starting development servers..."
pnpm --filter @crm-atlas/api --filter @crm-atlas/indexer --filter @crm-atlas/workflow --filter @crm-atlas/mcp-server --parallel dev






