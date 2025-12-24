#!/bin/bash
# Script to start API + Playground + Agent Service together (local development)
#
# Prerequisites:
#   - External services (MongoDB, Redis, Typesense, Qdrant, Minio) already running (e.g. via Docker: pnpm docker:up)
#   - This script does NOT manage Docker; it only runs Node dev servers.

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CRM Atlas Development Environment (local)${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️  Warning: .env file not found in project root${NC}"
  echo "Creating .env from .env.example..."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file. Please edit it and add your API keys.${NC}"
    exit 1
  else
    echo -e "${YELLOW}⚠️  Warning: .env.example not found, continuing without .env${NC}"
  fi
fi

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
  # shellcheck disable=SC2046
  export $(grep -v ^# .env | grep -v ^ | xargs)
  echo -e "${GREEN}✅ Environment variables loaded from .env${NC}"
fi

# Kill any existing processes on ports
echo -e "${BLUE}🔍 Checking for existing processes on ports 3000, 4100, 5173...${NC}"

PORTS=(3000 4100 5173)
PORTS_NAMES=("API Server" "Agent Service" "Playground")
killed_any=false

for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  name="${PORTS_NAMES[$i]}"

  if lsof -ti:$port > /dev/null 2>&1; then
    PID="$(lsof -ti:$port | head -1)"
    echo -e "${YELLOW}⚠️  Found process (PID: $PID) on port $port ($name), killing it...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    killed_any=true
  else
    echo -e "${GREEN}✅ Port $port ($name) is free${NC}"
  fi
done

if [ "$killed_any" = true ]; then
  echo -e "${BLUE}⏳ Waiting 2 seconds for ports to be released...${NC}"
  sleep 2

  echo -e "${BLUE}🔍 Verifying ports are free...${NC}"
  all_free=true
  for i in "${!PORTS[@]}"; do
    port="${PORTS[$i]}"
    name="${PORTS_NAMES[$i]}"
    if lsof -ti:$port > /dev/null 2>&1; then
      echo -e "${YELLOW}⚠️  Port $port ($name) is still in use!${NC}"
      all_free=false
    else
      echo -e "${GREEN}✅ Port $port ($name) is now free${NC}"
    fi
  done

  if [ "$all_free" = false ]; then
    echo -e "${YELLOW}⚠️  Some ports are still in use. You may need to manually free them.${NC}"
  fi
fi

echo ""

# Optionally set environment variables for localhost services (if not already set)
if [ -z "$MONGODB_URI" ]; then
  export MONGODB_URI="mongodb://localhost:27017/crm_atlas"
  echo -e "${BLUE}📝 Set MONGODB_URI to localhost (local development)${NC}"
fi

if [ -z "$REDIS_URL" ]; then
  export REDIS_URL="redis://localhost:6379"
  echo -e "${BLUE}📝 Set REDIS_URL to localhost (local development)${NC}"
fi

if [ -z "$TYPESENSE_HOST" ]; then
  export TYPESENSE_HOST="localhost"
  echo -e "${BLUE}📝 Set TYPESENSE_HOST to localhost (local development)${NC}"
fi

if [ -z "$QDRANT_URL" ]; then
  export QDRANT_URL="http://localhost:6333"
  echo -e "${BLUE}📝 Set QDRANT_URL to localhost (local development)${NC}"
fi

# Ensure OPENAI_API_KEY is exported (needed by agent-service)
if [ -z "$OPENAI_API_KEY" ] && [ -f ".env" ]; then
  OPENAI_API_KEY_VALUE=$(grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -n "$OPENAI_API_KEY_VALUE" ]; then
    export OPENAI_API_KEY="$OPENAI_API_KEY_VALUE"
    echo -e "${BLUE}📝 Loaded OPENAI_API_KEY from .env${NC}"
  fi
fi

echo ""
echo -e "${BLUE}📦 Building shared packages (utils, embeddings, search)...${NC}"
pnpm -w -r --filter @crm-atlas/utils --filter @crm-atlas/embeddings --filter @crm-atlas/search build

echo ""
echo -e "${GREEN}🚀 Starting services in dev mode:${NC}"
echo -e "  ${BLUE}•${NC} API Server:        http://localhost:3000"
echo -e "  ${BLUE}•${NC} Agent Service:      http://localhost:4100"
echo -e "  ${BLUE}•${NC} Playground:         http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start all services in parallel (local dev)
pnpm --filter @crm-atlas/api --filter @crm-atlas/agent-service --filter @crm-atlas/playground --parallel dev

