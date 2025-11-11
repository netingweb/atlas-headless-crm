#!/bin/bash
# Script to start the API with environment variables loaded from .env

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "⚠️  Warning: .env file not found in project root"
  echo "Creating .env from .env.example..."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please edit it and add your API keys."
    exit 1
  else
    echo "❌ Error: .env.example not found"
    exit 1
  fi
fi

# Load environment variables from .env file
# This exports all variables defined in .env
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# Verify OPENAI_API_KEY is set (if using OpenAI)
if [ -z "$OPENAI_API_KEY" ] && [ "${EMBEDDINGS_PROVIDER:-openai}" = "openai" ]; then
  echo "⚠️  Warning: OPENAI_API_KEY is not set in .env file"
  echo "Semantic search will not work without it."
fi

# Kill any existing process on port 3000
echo "🔍 Checking for existing processes on port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "⚠️  Found existing process on port 3000, killing it..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Start the API
echo "🚀 Starting API server..."
echo "📝 Environment variables loaded from .env"
echo "🔑 OPENAI_API_KEY: ${OPENAI_API_KEY:0:20}..." 
echo ""

pnpm --filter @crm-atlas/api dev









