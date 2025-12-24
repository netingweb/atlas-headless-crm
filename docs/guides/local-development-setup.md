# Local Development Setup Guide

This guide explains how to set up and run the CRM Atlas development environment locally.

## 🐳 Docker Configuration

### Understanding the Setup

CRM Atlas uses Docker Compose with two configuration files:

1. **`docker-compose.yml`**: Base configuration for production (with Traefik)
2. **`docker-compose.override.yml`**: Local development overrides (ports exposed, Traefik disabled, MongoDB Replica Set)

The override file is **automatically loaded** by Docker Compose - you don't need to specify it manually!

### MongoDB Replica Set

The local MongoDB is configured as a **single-node replica set** to support Change Streams (required by the Indexer service). On first start, it takes ~40 seconds to initialize the replica set. See [MongoDB Replica Set Guide](./mongodb-replica-set-local.md) for details.

### Services Available

| Service       | Port      | Purpose            |
| ------------- | --------- | ------------------ |
| MongoDB       | 27017     | Database           |
| Redis         | 6379      | Cache & Sessions   |
| Typesense     | 8108      | Search Engine      |
| Qdrant        | 6333-6334 | Vector Database    |
| MinIO         | 9000-9001 | Object Storage     |
| API           | 3000      | REST API (Docker)  |
| Agent Service | 4100      | AI Agents (Docker) |

## 🎯 Development Modes

### Mode 1: Full Docker Environment (Recommended for Testing)

Run everything in Docker containers:

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f api

# Stop all services
docker compose down
```

**Use this when:**

- Testing the production-like environment
- You want everything containerized
- Testing Dockerfiles and builds

### Mode 2: Hybrid Development (Recommended for Development)

Use Docker for databases, but run apps locally for hot-reload and debugging:

```bash
# 1. Start only the database services
docker compose up -d mongo redis typesense qdrant minio

# Stop the API and Agent Service containers (we'll run them locally)
docker compose stop api agent-service

# 2. Start the backend development servers (API, Indexer, Workflow, MCP)
pnpm dev:backend

# 3. In another terminal, start the agent service
pnpm dev:agent-service

# 4. In another terminal, start the playground frontend
pnpm dev:playground
```

**Use this when:**

- Actively developing and need hot-reload
- Debugging backend code
- Making frequent code changes

### Mode 3: Individual Services

Run specific services only:

```bash
# API only
pnpm dev

# Agent Service only
pnpm dev:agent-service

# Playground only
pnpm dev:playground
```

## ⚠️ Port Conflicts

### Problem: Docker API vs Local API

Both the Docker API container and local dev API want to use port 3000. This can cause:

- Docker daemon becoming unresponsive
- Port conflict errors
- Apps failing to start

### Solution

The new `dev:backend` command automatically:

1. Stops the Docker API and Agent Service containers
2. Keeps database containers running
3. Starts local development servers

```bash
# Safe command - stops Docker API/Agent, starts local dev
pnpm dev:backend

# Old unsafe command (kept for reference, but avoid using)
pnpm dev:backend:unsafe
```

## 🔧 Useful Commands

### Docker Management

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs

# Restart services
pnpm docker:restart

# Check status
pnpm docker:ps

# Clean everything (removes volumes!)
pnpm docker:clean
```

### Development

```bash
# Backend services (API, Indexer, Workflow, MCP)
pnpm dev:backend

# Agent Service
pnpm dev:agent-service

# Playground frontend
pnpm dev:playground

# All services together
pnpm dev:all

# Kill process on port 3000
pnpm kill:port
```

### Building

```bash
# Build all packages and apps
pnpm build

# Build specific packages
pnpm -w -r --filter @crm-atlas/utils build
```

### Database & Seeding

```bash
# Seed demo data
pnpm seed

# Reset Typesense
pnpm typesense:reset

# Sync configuration
pnpm config:sync

# Reindex everything
pnpm config:reindex
```

## 🚀 Recommended Workflow

### First Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start Docker databases
docker compose up -d mongo redis typesense qdrant minio

# 3. Seed demo data (if needed)
pnpm seed

# 4. Start development
pnpm dev:backend
```

### Daily Development

```bash
# Check if Docker databases are running
docker compose ps

# If not running, start them
docker compose up -d mongo redis typesense qdrant minio

# Start your dev environment
pnpm dev:backend

# In separate terminals:
pnpm dev:agent-service
pnpm dev:playground
```

### Before Committing

```bash
# Run quality checks
pnpm qa

# Or individually:
pnpm lint:fix
pnpm typecheck
pnpm test:coverage
pnpm build
```

## 🐛 Troubleshooting

### Docker Daemon Becomes Unresponsive

**Cause**: Port conflict between Docker API and local API, or too many parallel processes.

**Solution**:

1. Quit Docker Desktop completely
2. Restart Docker Desktop
3. Use `pnpm dev:backend` instead of `pnpm dev:backend:unsafe`

### Port 3000 Already in Use

```bash
# Find and kill the process
pnpm kill:port

# Or manually
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Refused

```bash
# Check if MongoDB container is running
docker compose ps mongo

# If not running, start it
docker compose up -d mongo

# Check logs
docker compose logs mongo
```

### Redis Connection Refused

```bash
# Check if Redis container is running
docker compose ps redis

# Start it
docker compose up -d redis
```

### Cannot Connect to Docker Daemon

```bash
# Check if Docker Desktop is running
ps aux | grep -i docker | grep -v grep

# If not running, open Docker Desktop
open -a Docker

# Wait 10-15 seconds for it to start
sleep 10 && docker info
```

## 📝 Notes

- The `docker-compose.override.yml` file is automatically loaded by Docker Compose
- It's in `.gitignore` so you can customize it locally without affecting the repo
- For production deployments, use `docker-compose.yml` directly (no override)
- The override file disables Traefik and exposes all ports for local development

## 🔗 Related Documentation

- [Docker Compose Setup](../README.md)
- [API Documentation](./api-usage.md)
- [Workflow System](../analysis/workflow-system-analysis.md)
- [Demo Setup Guides](../demo2-setup-guide.md)
