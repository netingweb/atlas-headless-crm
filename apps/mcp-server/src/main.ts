import { loadRootEnv } from '@crm-atlas/utils';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { connectMongo, getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { EntityRepository } from '@crm-atlas/db';
import { search, searchQdrant } from '@crm-atlas/search';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import { getEmbeddableFields } from '@crm-atlas/utils';
import type { TenantContext } from '@crm-atlas/core';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

class MCPServer {
  private server: Server;
  private configLoader: MongoConfigLoader;
  private repository: EntityRepository;

  constructor() {
    this.server = new Server(
      {
        name: 'crm-atlas',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.configLoader = new MongoConfigLoader(getDb());
    this.repository = new EntityRepository();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.generateTools();
      return { tools };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.generateResources();
      return { resources };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = await this.readResource(request.params.uri);
      return { contents: resource ? [resource] : [] };
    });

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const result = await this.callTool(request.params.name, request.params.arguments || {});
      return result;
    });
  }

  private async generateTools(): Promise<
    Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>
  > {
    const tenants = await this.configLoader.getTenants();
    const tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> = [];

    for (const tenant of tenants) {
      const units = await this.configLoader.getUnits(tenant.tenant_id);
      const entities = await this.configLoader.getEntities({
        tenant_id: tenant.tenant_id,
        unit_id: units[0]?.unit_id || '',
      });

      for (const entity of entities) {
        // Create entity tool
        tools.push({
          name: `create_${entity.name}`,
          description: `Create a new ${entity.name} in CRM`,
          inputSchema: {
            type: 'object',
            properties: this.buildEntityProperties(entity),
            required: entity.fields
              .filter((f: { required: boolean }) => f.required)
              .map((f: { name: string }) => f.name),
          },
        });

        // Search entity tool
        tools.push({
          name: `search_${entity.name}`,
          description: `Search for ${entity.name} using text or semantic search`,
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              type: {
                type: 'string',
                enum: ['text', 'semantic', 'hybrid'],
                description: 'Search type',
                default: 'hybrid',
              },
              limit: { type: 'number', description: 'Result limit', default: 10 },
            },
            required: ['query'],
          },
        });

        // Get entity by ID tool
        tools.push({
          name: `get_${entity.name}`,
          description: `Get a ${entity.name} by ID`,
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Entity ID' },
            },
            required: ['id'],
          },
        });

        // Special tools for document entity
        if (entity.name === 'document') {
          // Semantic search in document content
          tools.push({
            name: 'search_document_content',
            description:
              'Search semantically in document extracted content and metadata. Useful for finding specific information within documents.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Semantic search query to find relevant document content',
                },
                documentType: {
                  type: 'string',
                  description: 'Filter by document type (e.g., contract, technical_manual)',
                },
                relatedEntityType: {
                  type: 'string',
                  description: 'Filter by related entity type (e.g., contact, opportunity)',
                },
                relatedEntityId: {
                  type: 'string',
                  description: 'Filter by related entity ID',
                },
                limit: { type: 'number', description: 'Result limit', default: 10 },
              },
              required: ['query'],
            },
          });

          // Contextual document retrieval
          tools.push({
            name: 'get_documents_for_entity',
            description:
              'Retrieve all documents related to a specific entity (e.g., all contracts for a contact, all quotes for an opportunity)',
            inputSchema: {
              type: 'object',
              properties: {
                entityType: {
                  type: 'string',
                  description: 'Type of related entity (e.g., contact, opportunity, company)',
                },
                entityId: {
                  type: 'string',
                  description: 'ID of the related entity',
                },
                documentType: {
                  type: 'string',
                  description: 'Filter by document type (optional)',
                },
              },
              required: ['entityType', 'entityId'],
            },
          });

          // Find document by content context
          tools.push({
            name: 'find_document_by_context',
            description:
              'Find a specific document based on context (e.g., "find the quote for client X", "find the contract for opportunity Y")',
            inputSchema: {
              type: 'object',
              properties: {
                context: {
                  type: 'string',
                  description:
                    'Contextual description of the document to find (e.g., "quote for Acme Corp", "contract signed in 2024")',
                },
                relatedEntityType: {
                  type: 'string',
                  description: 'Type of related entity (e.g., contact, opportunity)',
                },
                relatedEntityId: {
                  type: 'string',
                  description: 'ID of the related entity',
                },
                documentType: {
                  type: 'string',
                  description: 'Expected document type (e.g., contract, quote)',
                },
              },
              required: ['context'],
            },
          });
        }
      }
    }

    return tools;
  }

  private buildEntityProperties(entity: {
    fields: Array<{ name: string; type: string; required: boolean }>;
  }): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    for (const field of entity.fields) {
      const schema: Record<string, unknown> = {};

      switch (field.type) {
        case 'string':
        case 'email':
        case 'url':
        case 'text':
          schema.type = 'string';
          break;
        case 'number':
          schema.type = 'number';
          break;
        case 'boolean':
          schema.type = 'boolean';
          break;
        case 'date':
          schema.type = 'string';
          schema.format = 'date';
          break;
        default:
          schema.type = 'string';
      }

      properties[field.name] = schema;
    }

    return properties;
  }

  private async generateResources(): Promise<
    Array<{ uri: string; name: string; description?: string; mimeType?: string }>
  > {
    const tenants = await this.configLoader.getTenants();
    const resources: Array<{ uri: string; name: string; description?: string; mimeType?: string }> =
      [];

    for (const tenant of tenants) {
      resources.push({
        uri: `crm://tenant/${tenant.tenant_id}`,
        name: `Tenant: ${tenant.tenant_id}`,
        description: `CRM data for tenant ${tenant.tenant_id}`,
        mimeType: 'application/json',
      });
    }

    return resources;
  }

  private async readResource(
    uri: string
  ): Promise<{ uri: string; mimeType: string; text: string } | null> {
    if (uri.startsWith('crm://tenant/')) {
      const tenantId = uri.replace('crm://tenant/', '');
      const units = await this.configLoader.getUnits(tenantId);
      const entities = await this.configLoader.getEntities({
        tenant_id: tenantId,
        unit_id: units[0]?.unit_id || '',
      });

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ tenant_id: tenantId, units, entities }, null, 2),
      };
    }

    return null;
  }

  private async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
      // Parse tool name (e.g., "create_contact", "search_company")
      const [action, entity] = name.split('_', 2);

      // Get default tenant/unit (in production, this should come from context)
      const tenants = await this.configLoader.getTenants();
      const tenantId = tenants[0]?.tenant_id || 'demo';
      const units = await this.configLoader.getUnits(tenantId);
      const unitId = units[0]?.unit_id || 'sales';

      const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };

      if (action === 'create') {
        const created = await this.repository.create(ctx, entity, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(created, null, 2),
            },
          ],
          isError: false,
        };
      }

      if (action === 'search') {
        const searchType = (args.type as string) || 'hybrid';
        const query = args.query as string;
        const limit = (args.limit as number) || 10;

        if (searchType === 'semantic' || searchType === 'hybrid') {
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          if (entityDef) {
            const embeddableFields = getEmbeddableFields(entityDef);
            if (embeddableFields.length > 0) {
              const tenantConfig = await this.configLoader.getTenant(tenantId);
              const globalConfig = getProviderConfig();
              const provider = createEmbeddingsProvider(
                globalConfig,
                tenantConfig?.embeddingsProvider
              );
              const [queryVector] = await provider.embedTexts([query]);

              const results = await searchQdrant(tenantId, entity, {
                vector: queryVector,
                limit,
                filter: {
                  must: [
                    { key: 'tenant_id', match: { value: tenantId } },
                    { key: 'unit_id', match: { value: unitId } },
                  ],
                },
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(results, null, 2),
                  },
                ],
                isError: false,
              };
            }
          }
        }

        // Fallback to text search
        const results = await search(ctx, entity, {
          q: query,
          per_page: limit,
          page: 1,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
          isError: false,
        };
      }

      if (action === 'get') {
        const id = args.id as string;
        const doc = await this.repository.findById(ctx, entity, id);

        if (!doc) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Not found' }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(doc, null, 2),
            },
          ],
          isError: false,
        };
      }

      // Document-specific tools
      if (name === 'search_document_content') {
        return this.searchDocumentContent(ctx, args);
      }

      if (name === 'get_documents_for_entity') {
        return this.getDocumentsForEntity(ctx, args);
      }

      if (name === 'find_document_by_context') {
        return this.findDocumentByContext(ctx, args);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Unknown action: ${action}` }, null, 2),
          },
        ],
        isError: true,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Search semantically in document content
   */
  private async searchDocumentContent(
    ctx: TenantContext,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
      const query = args.query as string;
      const documentType = args.documentType as string | undefined;
      const relatedEntityType = args.relatedEntityType as string | undefined;
      const relatedEntityId = args.relatedEntityId as string | undefined;
      const limit = (args.limit as number) || 10;

      // Build filter for Qdrant search
      const filter: { must: Array<Record<string, unknown>> } = {
        must: [
          { key: 'tenant_id', match: { value: ctx.tenant_id } },
          { key: 'unit_id', match: { value: ctx.unit_id } },
        ],
      };

      if (documentType) {
        filter.must.push({ key: 'document_type', match: { value: documentType } });
      }

      if (relatedEntityType) {
        filter.must.push({ key: 'related_entity_type', match: { value: relatedEntityType } });
      }

      if (relatedEntityId) {
        filter.must.push({ key: 'related_entity_id', match: { value: relatedEntityId } });
      }

      // Generate embedding for query
      const tenantConfig = await this.configLoader.getTenant(ctx.tenant_id);
      const globalConfig = getProviderConfig();
      const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);
      const [queryVector] = await provider.embedTexts([query]);

      // Search in Qdrant
      const results = await searchQdrant(ctx.tenant_id, 'document', {
        vector: queryVector,
        limit,
        filter,
      });

      // Fetch full document details for results
      const documents = await Promise.all(
        results.map(async (result) => {
          const docId = result.payload.document_id as string;
          const doc = await this.repository.findById(ctx, 'document', docId);
          if (!doc) {
            return null;
          }

          // Normalize document to ensure ID is accessible
          const normalizedDoc: Record<string, unknown> = {
            ...doc,
            id: doc._id, // Add id field pointing to _id for easier access
          };

          return {
            ...result,
            document: normalizedDoc,
            documentId: doc._id, // Explicit document ID for easy access
          };
        })
      );

      // Filter out null results
      const validDocuments = documents.filter((d) => d !== null);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query,
                results: validDocuments,
                count: validDocuments.length,
                // Include document IDs in a separate array for easy access
                documentIds: validDocuments.map((r) => (r as { documentId: string }).documentId),
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get all documents for a specific entity
   */
  private async getDocumentsForEntity(
    ctx: TenantContext,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
      const entityType = args.entityType as string;
      const entityId = args.entityId as string;
      const documentType = args.documentType as string | undefined;

      // Search documents with filters
      const filters: Record<string, unknown> = {
        related_entity_type: entityType,
        related_entity_id: entityId,
      };

      if (documentType) {
        filters.document_type = documentType;
      }

      const documents = await this.repository.find(ctx, 'document', filters);

      // Normalize documents to ensure IDs are accessible
      const normalizedDocuments = documents.map((doc) => {
        const normalized: Record<string, unknown> = {
          ...doc,
          id: doc._id, // Add id field pointing to _id for easier access
        };
        return normalized;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                entityType,
                entityId,
                documents: normalizedDocuments,
                count: normalizedDocuments.length,
                // Include document IDs in a separate array for easy access
                documentIds: normalizedDocuments.map((doc) => doc.id || doc._id),
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Find document by contextual description
   */
  private async findDocumentByContext(
    ctx: TenantContext,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
      const context = args.context as string;
      const relatedEntityType = args.relatedEntityType as string | undefined;
      const relatedEntityId = args.relatedEntityId as string | undefined;
      const documentType = args.documentType as string | undefined;

      // Build filter
      const filter: { must: Array<Record<string, unknown>> } = {
        must: [
          { key: 'tenant_id', match: { value: ctx.tenant_id } },
          { key: 'unit_id', match: { value: ctx.unit_id } },
        ],
      };

      if (relatedEntityType) {
        filter.must.push({ key: 'related_entity_type', match: { value: relatedEntityType } });
      }

      if (relatedEntityId) {
        filter.must.push({ key: 'related_entity_id', match: { value: relatedEntityId } });
      }

      if (documentType) {
        filter.must.push({ key: 'document_type', match: { value: documentType } });
      }

      // Generate embedding for context query
      const tenantConfig = await this.configLoader.getTenant(ctx.tenant_id);
      const globalConfig = getProviderConfig();
      const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);
      const [queryVector] = await provider.embedTexts([context]);

      // Search in Qdrant
      const results = await searchQdrant(ctx.tenant_id, 'document', {
        vector: queryVector,
        limit: 5, // Return top 5 matches
        filter,
      });

      // Fetch full document details
      const documents = await Promise.all(
        results.map(async (result) => {
          const docId = result.payload.document_id as string;
          const doc = await this.repository.findById(ctx, 'document', docId);
          if (!doc) {
            return null;
          }

          // Normalize document to ensure ID is accessible
          const normalizedDoc: Record<string, unknown> = {
            ...doc,
            id: doc._id, // Add id field pointing to _id for easier access
          };

          return {
            ...result,
            document: normalizedDoc,
            documentId: doc._id, // Explicit document ID for easy access
          };
        })
      );

      // Filter out null results
      const validDocuments = documents.filter((d) => d !== null);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                context,
                matches: validDocuments,
                count: validDocuments.length,
                // Include document IDs in a separate array for easy access
                documentIds: validDocuments.map((r) => (r as { documentId: string }).documentId),
              },
              null,
              2
            ),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ MCP Server avviato');
  }
}

async function main(): Promise<void> {
  try {
    loadRootEnv();
    await connectMongo(mongoUri, dbName);
    console.log('✅ Connesso a MongoDB');

    const server = new MCPServer();
    await server.start();
  } catch (error) {
    console.error('❌ Errore avvio MCP Server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
