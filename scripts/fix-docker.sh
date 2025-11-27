#!/bin/bash
# Script to fix Docker connection issues on macOS

set -e

echo "🔧 Fixing Docker connection issues..."
echo ""

# Check if Docker Desktop is running
if ! pgrep -f "Docker Desktop" > /dev/null; then
  echo "❌ Docker Desktop is not running!"
  echo "   Please start Docker Desktop and wait for it to fully initialize."
  exit 1
fi

echo "✅ Docker Desktop process is running"
echo ""

# Check Docker context
echo "🔍 Checking Docker context..."
CURRENT_CONTEXT=$(docker context ls --format '{{.Name}}' | grep '*' | sed 's/\*//' | tr -d ' ')
echo "Current context: $CURRENT_CONTEXT"

if [ "$CURRENT_CONTEXT" != "desktop-linux" ]; then
  echo "📝 Switching to desktop-linux context..."
  docker context use desktop-linux 2>/dev/null || true
fi

# Wait for Docker to be ready
echo ""
echo "⏳ Waiting for Docker daemon to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker info > /dev/null 2>&1; then
    echo "✅ Docker daemon is ready!"
    docker info --format 'Docker version: {{.ServerVersion}}' 2>/dev/null || true
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 2 seconds..."
    sleep 2
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo ""
  echo "❌ Docker daemon is not responding after $MAX_RETRIES attempts"
  echo ""
  echo "💡 Try these solutions:"
  echo "   1. Restart Docker Desktop:"
  echo "      - Quit Docker Desktop completely"
  echo "      - Wait 10 seconds"
  echo "      - Start Docker Desktop again"
  echo "      - Wait for it to fully initialize (green icon in menu bar)"
  echo ""
  echo "   2. Reset Docker context:"
  echo "      docker context reset desktop-linux"
  echo ""
  echo "   3. Check Docker Desktop logs:"
  echo "      ~/Library/Containers/com.docker.docker/Data/log/host/*.log"
  exit 1
fi

# Test docker-compose
echo ""
echo "🔍 Testing docker-compose..."
if command -v docker-compose &> /dev/null; then
  docker-compose version 2>&1 | head -1 || echo "⚠️  docker-compose has issues"
elif command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
  docker compose version 2>&1 | head -1 || echo "⚠️  docker compose has issues"
else
  echo "❌ docker-compose not found"
  exit 1
fi

echo ""
echo "✅ Docker is ready to use!"
echo ""
echo "You can now run:"
echo "  ./scripts/start-all.sh"







