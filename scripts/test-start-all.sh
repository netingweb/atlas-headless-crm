#!/bin/bash
# Test script to verify start-all.sh functionality

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧪 Testing start-all.sh script..."
echo ""

# Test 1: Check if script exists and is executable
echo "Test 1: Script exists and is executable"
if [ -f "./scripts/start-all.sh" ] && [ -x "./scripts/start-all.sh" ]; then
  echo "✅ PASS: Script exists and is executable"
else
  echo "❌ FAIL: Script not found or not executable"
  exit 1
fi

# Test 2: Check Docker detection (should fail if Docker not running)
echo ""
echo "Test 2: Docker daemon detection"
if docker info > /dev/null 2>&1; then
  echo "✅ PASS: Docker is running"
  DOCKER_RUNNING=true
else
  echo "⚠️  INFO: Docker is not running (expected in test environment)"
  DOCKER_RUNNING=false
fi

# Test 3: Check port detection
echo ""
echo "Test 3: Port detection"
PORTS=(3000 4100 5173)
PORTS_NAMES=("API Server" "Agent Service" "Playground")
for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  name="${PORTS_NAMES[$i]}"
  if lsof -ti:$port > /dev/null 2>&1; then
    PID=$(lsof -ti:$port | head -1)
    echo "⚠️  INFO: Port $port ($name) is in use (PID: $PID)"
  else
    echo "✅ INFO: Port $port ($name) is free"
  fi
done

# Test 4: Check docker-compose.override.yml
echo ""
echo "Test 4: docker-compose.override.yml check"
if [ -f "docker-compose.override.yml" ]; then
  echo "✅ INFO: docker-compose.override.yml exists"
else
  if [ -f "docker-compose.override.yml.example" ]; then
    echo "⚠️  INFO: docker-compose.override.yml does not exist (will be created automatically)"
  else
    echo "❌ WARN: docker-compose.override.yml.example not found"
  fi
fi

# Test 5: Check environment variables
echo ""
echo "Test 5: Environment variables"
ENV_VARS=("MONGODB_URI" "REDIS_URL" "TYPESENSE_HOST" "QDRANT_URL")
for var in "${ENV_VARS[@]}"; do
  if [ -n "${!var}" ]; then
    echo "✅ INFO: $var is set"
  else
    echo "⚠️  INFO: $var is not set (will be set to localhost)"
  fi
done

# Test 6: Check required files
echo ""
echo "Test 6: Required files check"
REQUIRED_FILES=("package.json" "docker-compose.yml" "docker-compose.override.yml.example")
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ PASS: $file exists"
  else
    echo "❌ FAIL: $file not found"
    exit 1
  fi
done

echo ""
echo "✅ All basic tests passed!"
echo ""
if [ "$DOCKER_RUNNING" = false ]; then
  echo "⚠️  To test the full script, start Docker Desktop and run:"
  echo "   ./scripts/start-all.sh"
else
  echo "✅ Docker is running. You can test the full script with:"
  echo "   ./scripts/start-all.sh"
fi



