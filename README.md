# Atlas CRM Headless

**Headless CRM multi-tenant, API-first, MCP-ready, open source.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Author](https://img.shields.io/badge/Author-Luca%20Mainieri-blue.svg)](https://www.neting.it)

**Author**: [Luca Mainieri](https://www.neting.it) | **License**: MIT

## 📖 Introduction

Atlas CRM Headless is a modern and flexible CRM platform designed to be completely **headless**, **multi-tenant**, and ready for integration with AI assistants via the Model Context Protocol (MCP).

### What is Atlas CRM Headless?

Atlas CRM Headless is a headless CRM system that completely separates business logic from the user interface, allowing you to build any type of frontend (web, mobile, desktop) using the same powerful and flexible API. Unlike traditional CRMs, Atlas CRM Headless is designed to be:

- **API-first**: All functionality is accessible via REST API, enabling integrations with any technology
- **Multi-tenant & Multi-unit**: Native support for complex organizations with multiple divisions and operational units
- **JSON-driven**: Complete configuration via JSON files without code modifications
- **MCP-ready**: Native integration with AI assistants (Claude, GPT, etc.) via Model Context Protocol

### 🎯 Goals and Objectives

Atlas CRM Headless was created to solve the main problems of traditional CRMs:

1. **Flexibility**: Allow organizations to completely customize the CRM without source code modifications
2. **Scalability**: Support organizations of any size with multi-tenant architecture
3. **Integrability**: Facilitate integration with existing systems via standard REST APIs
4. **Modernity**: Leverage the most advanced technologies (semantic search, AI, automation) to offer a superior experience
5. **Open Source**: Provide a transparent, community-driven open source solution

### 🏛️ Development Principles

Atlas CRM Headless follows clear and consistent development principles:

- **Headless Architecture**: Complete separation between backend and frontend for maximum flexibility
- **Configuration over Code**: Configuration via JSON instead of code modifications
- **API-first Design**: All functionality exposed via well-documented REST APIs
- **Type Safety**: TypeScript strict mode to ensure code quality and maintainability
- **Test-Driven Development**: Automated tests to ensure stability and reliability
- **Documentation First**: Complete and always up-to-date documentation
- **Open Standards**: Use of open standards (REST, OpenAPI, MCP) for maximum interoperability

### ✨ Why Use Atlas CRM Headless?

#### Main Benefits

1. **🚀 Rapid Implementation**
   - Complete setup in minutes with Docker Compose
   - Configuration via JSON without writing code
   - Ready-to-use APIs with interactive documentation

2. **🔧 Maximum Flexibility**
   - Define your custom entities via JSON
   - Add fields, relationships, and validations without touching code
   - Adapt the CRM to your specific needs
   - **Note**: After modifying `entities.json`, run `pnpm config:sync` to apply changes

3. **📈 Enterprise Scalability**
   - Multi-tenant architecture to manage multiple organizations
   - Support for multiple units and divisions
   - Optimized performance for large data volumes

4. **🔍 Advanced Search**
   - Powerful full-text search with Typesense
   - Semantic search with embeddings (OpenAI/Jina)
   - Hybrid search combining both technologies

5. **🤖 Intelligent Automation**
   - Workflow engine based on events, schedules, or manual triggers
   - Complex automation with condition evaluation
   - Integration with external webhooks

6. **🧠 AI Integration**
   - Native MCP server for integration with AI assistants
   - Tools automatically generated for all configured entities
   - Query CRM via natural language

7. **🔒 Security and Control**
   - JWT and API Key authentication
   - Role-based access control (RBAC)
   - Data visibility control between units

8. **📚 Complete Documentation**
   - Interactive Swagger UI
   - Detailed guides for each component
   - Postman collection for quick testing

9. **🌐 Open Source**
   - Completely open source code (MIT License)
   - Total transparency
   - Community-driven development

10. **⚡ Performance**
    - Fastify for superior performance
    - Automatic indexing for fast searches
    - Intelligent caching

#### Ideal Use Cases

- **Digital Agencies**: Client and project management with custom configuration
- **Tech Startups**: Flexible CRM that grows with the company
- **Enterprise**: Multi-tenant solution for complex organizations
- **SaaS Platforms**: Foundation for building SaaS products with integrated CRM
- **AI-Powered Applications**: Native integration with AI assistants for intelligent automation

## 🚀 Main Features

### Core Features

- **Multi-tenant & Multi-unit**: Complete support for complex organizations with multiple divisions
- **API-first**: All functionality accessible via REST API
- **JSON-driven Configuration**: Complete configuration via JSON files (tenant, entities, permissions, workflows)
- **Generic CRUD**: Flexible system to manage any type of entity without code modifications
- **Dynamic Validation**: Automatic validation based on JSON schemas with AJV
- **Entity Relationships**: Complete management of one-to-many relationships with validation and automatic populate

### Advanced Search

- **Full-text Search**: Powerful textual search with Typesense
- **Semantic Search**: Semantic search with embeddings (OpenAI/Jina) and Qdrant
- **Hybrid Search**: Intelligent combination of textual and semantic search with weighted scoring
- **Automatic Indexing**: Automatic synchronization MongoDB → Typesense/Qdrant via Change Streams

### Automation

- **Workflow Engine**: Automation based on events, schedules, or manual triggers with BullMQ
- **Action Types**: Update, Create, Notify, Assign, Webhook
- **Condition Evaluation**: Advanced condition evaluation system for complex workflows

### AI Integration

- **MCP Server**: Complete integration with AI assistants (Claude, GPT, etc.)
- **Dynamic Tools**: Automatic generation of tools for all configured entities
- **Resources**: Access to configurations via MCP protocol

### Authentication & Security

- **JWT Authentication**: Token-based authentication with JWT
- **API Key Support**: Support for authentication via API key
- **Role-based Access Control (RBAC)**: Permission system based on roles and scopes
- **Multi-unit Visibility**: Data visibility control between units

## 📋 Data Model

The system supports the following predefined entities:

- **Contact**: Contacts/people with relationships to companies
- **Company**: Companies/clients with multiple associated contacts
- **Note**: Notes related to companies or contacts
- **Task**: Activities with deadlines and types
- **Opportunity**: Sales opportunities with stages and values

All entities support:

- Custom fields via JSON configuration
- Reference relationships between entities
- Dictionaries for predefined values
- Embeddable fields for semantic search
- Searchable fields for full-text search

See [docs/guides/data-model.md](docs/guides/data-model.md) for complete details.

## 🏗️ Architecture

### Monorepo Structure

```
crm-atlas/
├── apps/                    # Applications
│   ├── api/                 # Main REST API (NestJS)
│   ├── indexer/             # Automatic indexing service
│   ├── workflow/            # Workflow Engine (BullMQ)
│   └── mcp-server/          # MCP Server for AI assistants
├── packages/                # Shared packages
│   ├── core/                # Errors, context, validation, ACL
│   ├── config/              # JSON-driven configuration
│   ├── auth/                # Authentication (JWT, API Key, password)
│   ├── db/                  # MongoDB connection and repository
│   ├── search/              # Typesense and Qdrant integration
│   ├── embeddings/          # Embeddings providers (OpenAI, Jina)
│   ├── types/               # TypeScript types and Zod schemas
│   └── utils/               # Utility functions
├── config/                  # JSON configurations for tenants
│   └── demo/                # Demo tenant configuration
├── scripts/                 # Utility scripts
│   ├── seed.ts              # Initial database seed
│   └── sync-config.ts       # Sync JSON config → MongoDB
└── docs/                    # Documentation
```

### Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS with Fastify
- **Database**: MongoDB 7.0
- **Cache/Queue**: Redis 7
- **Full-text Search**: Typesense 0.25
- **Vector DB**: Qdrant 1.7
- **Embeddings**: OpenAI (text-embedding-ada-002) or Jina
- **Queue System**: BullMQ
- **Package Manager**: PNPM with workspaces
- **Language**: TypeScript 5.3+

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PNPM 8+
- Docker & Docker Compose

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/netingweb/atlas-headless-crm.git
cd atlas-headless-crm

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your configurations (optional for local development)

# 4. Start Docker services (MongoDB, Redis, Typesense, Qdrant)
pnpm docker:up

# 5. Seed database (creates demo tenant and admin user)
pnpm seed

# 6. Start API in development mode
pnpm dev
```

The API will be available at **http://localhost:3000**

**Interactive API Documentation**: http://localhost:3000/docs

For a detailed guide, see [docs/guides/running-and-testing.md](docs/guides/running-and-testing.md)

## 📚 Available Services

### 1. API Server (`apps/api`)

The main API service that exposes all CRM functionality via REST API.

**Start:**

```bash
pnpm dev          # Development (watch mode)
pnpm start         # Production
```

**Main endpoints:**

- `GET /api/health` - Health check
- `POST /api/auth/login` - Authentication
- `GET /api/:tenant/:unit/:entity` - List entities
- `POST /api/:tenant/:unit/:entity` - Create entity
- `GET /api/:tenant/:unit/:entity/:id` - Get entity
- `PUT /api/:tenant/:unit/:entity/:id` - Update entity
- `DELETE /api/:tenant/:unit/:entity/:id` - Delete entity
- `GET /api/:tenant/:unit/:entity/:id/:relatedEntity` - Related entities
- `POST /api/:tenant/:unit/search/text` - Full-text search
- `POST /api/:tenant/:unit/search/semantic` - Semantic search
- `POST /api/:tenant/:unit/search/hybrid` - Hybrid search

**Documentation**: Available at `/docs` (Swagger UI) and `/docs/json` (OpenAPI spec)

### 2. Indexer Service (`apps/indexer`)

Service that automatically synchronizes data from MongoDB to Typesense and Qdrant using MongoDB Change Streams.

**Start:**

```bash
pnpm indexer              # Start indexer
pnpm indexer:backfill      # Backfill indexes for existing data
```

**Features:**

- Monitors all MongoDB changes in real-time
- Automatically indexes new/updated documents in Typesense
- Automatically indexes embeddable fields in Qdrant
- Removes deleted documents from indexes

See [docs/guides/indexer.md](docs/guides/indexer.md) for details.

### 3. Workflow Engine (`apps/workflow`)

Automation engine based on events, schedules, or manual triggers.

**Start:**

```bash
pnpm workflow
```

**Features:**

- Event-based triggers (entity.created, entity.updated, entity.deleted)
- Scheduled triggers (cron expressions)
- Manual triggers
- Action types: update, create, notify, assign, webhook
- Condition evaluation engine

**Configuration**: Workflows are defined in `config/{tenant_id}/workflows.json`

See [docs/guides/workflow-engine.md](docs/guides/workflow-engine.md) for details.

### 4. MCP Server (`apps/mcp-server`)

MCP server for integration with AI assistants.

**Start:**

```bash
pnpm mcp
```

**Features:**

- Dynamically generates tools for all configured entities
- CRUD operations (create, get, search)
- Advanced search (text, semantic, hybrid)
- Resources for configurations

See [docs/guides/mcp-server.md](docs/guides/mcp-server.md) for details.

## 🛠️ Available Scripts

### Development

```bash
# Development
pnpm dev                    # Start API in watch mode
pnpm start                  # Start API in production

# Build
pnpm build                  # Build all packages
pnpm clean                  # Remove build artifacts

# Code Quality
pnpm lint                   # Lint all packages
pnpm lint:fix               # Lint and auto-fix
pnpm format                 # Format code with Prettier
pnpm format:check           # Check formatting
pnpm typecheck              # TypeScript type check
pnpm qa                     # Complete QA (lint + typecheck + test + build)
```

### Testing

```bash
pnpm test                   # Run all tests
pnpm test:coverage          # Tests with coverage report
pnpm test:watch             # Tests in watch mode
```

### Database

```bash
pnpm seed                   # Seed database (local)
pnpm seed:docker            # Seed database (Docker)
pnpm config:sync            # Sync JSON config → MongoDB
```

### Services

```bash
pnpm indexer                # Start Indexer Service
pnpm indexer:backfill       # Backfill indexes
pnpm workflow               # Start Workflow Engine
pnpm mcp                    # Start MCP Server
```

### Docker

```bash
pnpm docker:up              # Start all services
pnpm docker:down            # Stop all services
pnpm docker:logs           # View logs
pnpm docker:restart        # Restart services
pnpm docker:ps              # List running services
pnpm docker:clean          # Stop and remove volumes
```

### Git Hooks

```bash
pnpm precommit              # Pre-commit hook (lint-staged)
pnpm prepush                # Pre-push hook (typecheck + test)
```

## 🧪 Testing

### Test Structure

The project includes unit and integration tests:

- **Unit Tests**: Tests for individual functions and classes
- **Integration Tests**: Tests for API endpoints and complete flows
- **Test Coverage**: Target > 80% (currently ~30-40%)

### Running Tests

```bash
# All tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# Specific package tests
pnpm --filter @crm-atlas/api test
```

### Available Tests

- `packages/core/src/validation.test.ts` - AJV validation
- `packages/config/src/cache.test.ts` - Config cache
- `packages/utils/src/helpers.test.ts` - Utility functions
- `apps/api/src/health/health.controller.test.ts` - Health endpoints
- `apps/api/src/auth/auth.service.test.ts` - Authentication
- `apps/api/src/entities/entities.service.test.ts` - Entity CRUD
- `apps/api/src/entities/relations.service.test.ts` - Relationships

See [docs/guides/testing.md](docs/guides/testing.md) for details.

## 📖 API Documentation

### Swagger UI

Interactive API documentation is available at:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/docs/json

### Postman Collection

A complete Postman collection is available in `docs/postman/`:

- `CRM-Atlas.postman_collection.json` - Collection with all endpoints
- `CRM-Atlas.postman_environment.json` - Environment variables

See [docs/postman/README.md](docs/postman/README.md) for import instructions.

### Main Endpoints

#### Authentication

```bash
POST /api/auth/login
Body: { tenant_id, email, password }
Response: { token }
```

#### Entity CRUD

```bash
# List
GET /api/:tenant/:unit/:entity

# Create
POST /api/:tenant/:unit/:entity
Body: { ...entityFields }

# Get
GET /api/:tenant/:unit/:entity/:id?populate=true

# Update
PUT /api/:tenant/:unit/:entity/:id
Body: { ...fieldsToUpdate }

# Delete
DELETE /api/:tenant/:unit/:entity/:id
```

#### Relationships

```bash
# Get related entities
GET /api/:tenant/:unit/:entity/:id/:relatedEntity
# Example: GET /api/demo/sales/company/123/contacts
```

#### Search

```bash
# Full-text
POST /api/:tenant/:unit/search/text
Body: { q, entity, per_page, page, filter_by }

# Semantic
POST /api/:tenant/:unit/search/semantic?entity=contact&q=query&limit=10

# Hybrid
POST /api/:tenant/:unit/search/hybrid
Body: { q, entity, semantic_weight, text_weight, limit }
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/crm_atlas
MONGODB_DB_NAME=crm_atlas

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Typesense
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=xyz

# Qdrant
QDRANT_URL=http://localhost:6333

# API
API_PORT=3000
API_HOST=0.0.0.0
JWT_SECRET=supersecretjwtkey
JWT_EXPIRATION_TIME=3600s

# Embeddings
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=text-embedding-ada-002
JINA_API_KEY=your-jina-key
JINA_MODEL=jina-embeddings-v2-base-en
```

### JSON Configuration

Configurations are managed via JSON files in `config/{tenant_id}/`:

- `tenant.json` - Tenant configuration (embeddings provider, settings)
- `units.json` - Units/divisions
- `entities.json` - Entity and field definitions
- `permissions.json` - Roles and scopes
- `dictionary.json` - Predefined value dictionaries
- `workflows.json` - Automation workflows
- `mcp.manifest.json` - MCP manifest (optional)

See [config/README.md](config/README.md) for details.

### Configuration Synchronization

**⚠️ IMPORTANT: You must sync after every configuration change!**

After modifying JSON configuration files, you **must** synchronize them to MongoDB:

```bash
# Sync demo tenant
pnpm config:sync demo

# Or specify a different tenant
pnpm config:sync <tenant_id>
```

#### When to Sync

You **must** run `pnpm config:sync` after modifying:

- ✅ **entities.json** - Adding/modifying/removing entities or fields
- ✅ **tenant.json** - Tenant configuration changes
- ✅ **units.json** - Adding/modifying units
- ✅ **permissions.json** - Role and permission changes
- ✅ **dictionary.json** - Dictionary changes
- ✅ **sharing_policy.json** - Sharing policy changes
- ✅ **workflows.json** - Workflow changes
- ✅ **mcp.manifest.json** - MCP manifest changes

**Note**: Configuration changes in JSON files are **not automatically applied**. The API loads configurations from MongoDB, so you must sync your changes to the database.

#### What Sync Does

The sync script:

1. Reads all JSON files from `config/{tenant_id}/`
2. Syncs configurations to MongoDB database
3. Replaces existing configurations (upsert)
4. API will reload new configurations on next access (or after cache clear)

#### Clear API Cache (Optional)

After syncing, you can clear the API cache to force immediate reload:

```bash
curl -X GET "http://localhost:3000/api/demo/config/clear-cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or restart the API to reload configurations.

See [config/README.md](config/README.md) for more details.

## 🔒 Authentication

### JWT Token

After login, use the token in the header:

```bash
Authorization: Bearer <token>
```

### API Key (Future)

Support for authentication via API key (in development).

## 📊 Monitoring & Health

### Health Checks

```bash
GET /api/health      # Complete health check
GET /api/ready       # Readiness check
GET /api/live        # Liveness check
```

### Logging

All services use structured logging:

- API: Integrated Fastify logging
- Indexer: Console logging with emojis for clarity
- Workflow: Console logging for workflow execution
- MCP: Standard MCP protocol logging

## 🚢 Deployment

### Docker Compose

The project includes a complete `docker-compose.yml`:

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Logs
docker-compose logs -f api
```

### Production

1. **Build**:

   ```bash
   pnpm build
   ```

2. **Environment Variables**: Configure all environment variables

3. **Database**: Ensure MongoDB, Redis, Typesense, Qdrant are available

4. **Services**:

   ```bash
   # API
   pnpm start

   # Indexer (as separate service)
   pnpm indexer

   # Workflow Engine (as separate service)
   pnpm workflow
   ```

### CI/CD

The project includes GitHub Actions workflows:

- `.github/workflows/ci.yml` - Lint, typecheck, test, build
- `.github/workflows/docker.yml` - Build and push Docker images

## 📚 Complete Documentation

- [Quick Start Guide](docs/guides/quickstart.md)
- [Running & Testing](docs/guides/running-and-testing.md)
- [Data Model](docs/guides/data-model.md)
- [Testing Guide](docs/guides/testing.md)
- [Indexer Service](docs/guides/indexer.md)
- [Workflow Engine](docs/guides/workflow-engine.md)
- [MCP Server](docs/guides/mcp-server.md)
- [Roadmap](docs/ROADMAP.md)
- [Postman Collection](docs/postman/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use `pnpm lint:fix` before committing
- Follow TypeScript conventions
- Add tests for new features
- Update documentation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author & Credits

**Luca Mainieri**

- Website: [www.neting.it](https://www.neting.it)
- Project: Atlas CRM Headless

For a complete list of contributors and acknowledgments, see [AUTHORS.md](AUTHORS.md).

## 🙏 Acknowledgments

Atlas CRM Headless is built with amazing open-source technologies:

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [Typesense](https://typesense.org/) - Open source search engine
- [Qdrant](https://qdrant.tech/) - Vector similarity search engine
- [BullMQ](https://docs.bullmq.io/) - Premium Message Queue
- [Redis](https://redis.io/) - In-memory data structure store
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol for AI assistants
- [OpenAI](https://openai.com/) - AI embeddings provider
- [Jina AI](https://jina.ai/) - AI embeddings provider

---

**Made with ❤️ by [Luca Mainieri](https://www.neting.it)**
