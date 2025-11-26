#!/bin/bash
# Helper script to check and start Docker services

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker daemon is not running" >&2
  exit 1
fi

REQUIRED_SERVICES=("crm-atlas-mongo" "crm-atlas-redis" "crm-atlas-typesense" "crm-atlas-qdrant")
missing_services=()

for service in "${REQUIRED_SERVICES[@]}"; do
  if ! docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
    missing_services+=("$service")
  else
    status=$(docker inspect --format='{{.State.Status}}' "$service" 2>/dev/null || echo "unknown")
    if [ "$status" != "running" ]; then
      missing_services+=("$service")
    fi
  fi
done

if [ ${#missing_services[@]} -gt 0 ]; then
  # Start Docker services
  if command -v docker-compose &> /dev/null; then
    docker-compose up -d mongo redis typesense qdrant > /dev/null 2>&1
  elif command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    docker compose up -d mongo redis typesense qdrant > /dev/null 2>&1
  fi
  sleep 5
fi

