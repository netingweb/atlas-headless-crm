#!/bin/bash
# Script to reset Docker Desktop connection issues on macOS

set -e

echo "🔧 Resetting Docker Desktop connection..."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# Step 1: Kill all Docker processes
echo -e "${BLUE}Step 1: Stopping Docker Desktop processes...${NC}"
pkill -f "Docker Desktop" 2>/dev/null || true
pkill -f "com.docker.backend" 2>/dev/null || true
sleep 3

# Step 2: Check if processes are still running
if pgrep -f "Docker Desktop" > /dev/null; then
  echo -e "${YELLOW}⚠️  Some Docker processes are still running${NC}"
  echo -e "${BLUE}   Trying force kill...${NC}"
  pkill -9 -f "Docker Desktop" 2>/dev/null || true
  sleep 2
fi

# Step 3: Reset Docker context
echo -e "${BLUE}Step 2: Resetting Docker context...${NC}"
docker context use default 2>/dev/null || true
docker context use desktop-linux 2>/dev/null || true

# Step 4: Check socket permissions
echo -e "${BLUE}Step 3: Checking socket permissions...${NC}"
SOCKET_PATH="/Users/lucamainieri/Library/Containers/com.docker.docker/Data/backend.sock"
if [ -S "$SOCKET_PATH" ]; then
  PERMS=$(ls -l "$SOCKET_PATH" | awk '{print $1}')
  echo -e "${GREEN}✅ Socket exists: $PERMS${NC}"
else
  echo -e "${YELLOW}⚠️  Socket not found (will be created when Docker starts)${NC}"
fi

# Step 5: Start Docker Desktop
echo -e "${BLUE}Step 4: Starting Docker Desktop...${NC}"
open -a Docker 2>/dev/null || {
  echo -e "${RED}❌ Failed to start Docker Desktop${NC}"
  echo -e "${YELLOW}   Please start Docker Desktop manually${NC}"
  exit 1
}

echo -e "${GREEN}✅ Docker Desktop is starting...${NC}"
echo ""

# Step 6: Wait for Docker to be ready
echo -e "${BLUE}Step 5: Waiting for Docker daemon to be ready...${NC}"
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker daemon is ready!${NC}"
    docker info --format 'Docker version: {{.ServerVersion}}' 2>/dev/null || true
    break
  fi
  
  WAIT_COUNT=$((WAIT_COUNT + 3))
  if [ $WAIT_COUNT -lt $MAX_WAIT ]; then
    echo -e "${BLUE}   Waiting... (${WAIT_COUNT}s/${MAX_WAIT}s)${NC}"
    sleep 3
  fi
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Docker daemon is not responding after ${MAX_WAIT} seconds${NC}"
  echo ""
  echo -e "${BLUE}💡 Try these solutions:${NC}"
  echo "   1. Check Docker Desktop status in the menu bar"
  echo "   2. Wait a bit longer (Docker Desktop can take 1-2 minutes to fully start)"
  echo "   3. If Docker Desktop shows an error, restart your Mac"
  echo "   4. Check Docker Desktop logs:"
  echo "      ~/Library/Containers/com.docker.docker/Data/log/host/*.log"
  exit 1
fi

# Step 7: Test docker-compose
echo ""
echo -e "${BLUE}Step 6: Testing docker-compose...${NC}"
if command -v docker-compose &> /dev/null; then
  docker-compose version 2>&1 | head -1 || echo -e "${YELLOW}⚠️  docker-compose has issues${NC}"
elif command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
  docker compose version 2>&1 | head -1 || echo -e "${YELLOW}⚠️  docker compose has issues${NC}"
fi

echo ""
echo -e "${GREEN}✅ Docker is ready to use!${NC}"
echo ""
echo "You can now run:"
echo "  ./scripts/start-all.sh"


