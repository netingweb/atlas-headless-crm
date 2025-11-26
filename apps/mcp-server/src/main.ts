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
import {
  search,
  searchQdrant,
  indexEntityInSearch,
  removeEntityFromSearch,
} from '@crm-atlas/search';
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
    // Clear entities cache before generating tools to ensure we have the latest entity schemas
    // This ensures that after a sync, the MCP tools reflect the updated schemas
    this.configLoader.clearEntitiesCache();

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
        const entityLabel = entity.label || entity.name;
        // Create entity tool
        tools.push({
          name: `create_${entity.name}`,
          description: `Create a new ${entityLabel} in CRM`,
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
          description: `Search for ${entityLabel} using text or semantic search.

REQUIRED PARAMETERS:
- query (string): MANDATORY - The search term to look for. You MUST ALWAYS provide this parameter.

HOW TO USE:
1. When user asks about a specific ${entityLabel} by name/term:
   - Extract the name/term from user's question
   - Call with: {"query": "extracted_term", "limit": 10}
   - Examples:
     * User: "cerca se ho un contatto che si chiama Bianchi" → {"query": "Bianchi", "limit": 10}
     * User: "hai un cliente bianchi?" → {"query": "bianchi", "limit": 10}
     * User: "trova Mario Rossi" → {"query": "Mario Rossi", "limit": 10}
     * User: "dammi i dati di aleksandra" → {"query": "aleksandra", "limit": 10}

2. When user asks for count or all items:
   - Use: {"query": "*", "count_only": true} for count
   - Use: {"query": "*", "limit": 50} for all items

CRITICAL RULES:
- NEVER call this tool with empty arguments {} or without query parameter
- ALWAYS extract search terms from user's question and pass as "query"
- If user mentions a name/term, extract it and use it as query value
- Default query "*" returns ALL results - only use when user asks for "all" or "count"

OPTIONAL PARAMETERS:
- type: 'text' | 'semantic' | 'hybrid' (default: 'hybrid')
- limit: number (default: 10)
- count_only: boolean (default: false)`,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: `REQUIRED: Search query string. Extract this from user's question. Examples: If user says "cerca Bianchi" → use "Bianchi". If user says "trova Mario Rossi" → use "Mario Rossi" or "Mario" or "Rossi". Use "*" ONLY when user asks for all items or count.`,
              },
              type: {
                type: 'string',
                enum: ['text', 'semantic', 'hybrid'],
                description:
                  'Search type: text (fast), semantic (meaning-based), hybrid (both). Default: hybrid',
                default: 'hybrid',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return. Default: 10',
                default: 10,
              },
              count_only: {
                type: 'boolean',
                description: 'If true, return only the count without results. Default: false',
                default: false,
              },
            },
            required: ['query'],
          },
        });

        // Get entity by ID tool
        tools.push({
          name: `get_${entity.name}`,
          description: `Get a ${entityLabel} by ID`,
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Entity ID' },
            },
            required: ['id'],
          },
        });

        // Update entity tool
        tools.push({
          name: `update_${entity.name}`,
          description: `Update an existing ${entityLabel} in CRM by ID. This is a destructive action that requires explicit confirmation. First call will return a preview of the action - call again with confirmed=true to execute. IMPORTANT: If you don't know the entity ID, first use search_${entity.name} to find it, or use global_search if the entity type is unknown.`,
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: `${entityLabel} ID to update (REQUIRED). If ID is unknown, first search using search_${entity.name} with a descriptive query, or use global_search if entity type is unknown.`,
              },
              confirmed: {
                type: 'boolean',
                description:
                  'Set to true to confirm and execute the update. First call without this parameter will return a preview requiring confirmation.',
                default: false,
              },
              ...this.buildEntityProperties(entity),
            },
            required: ['id'],
          },
        });

        // Delete entity tool
        tools.push({
          name: `delete_${entity.name}`,
          description: `Delete a ${entityLabel} from CRM by ID. This is a destructive action that requires explicit confirmation. First call will return a preview of the action - call again with confirmed=true to execute. IMPORTANT: If you don't know the entity ID, first use search_${entity.name} to find it, or use global_search if the entity type is unknown.`,
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: `${entityLabel} ID to delete (REQUIRED). If ID is unknown, first search using search_${entity.name} with a descriptive query, or use global_search if entity type is unknown.`,
              },
              confirmed: {
                type: 'boolean',
                description:
                  'Set to true to confirm and execute the deletion. First call without this parameter will return a preview requiring confirmation.',
                default: false,
              },
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

    // Global search tool - search across all entities
    tools.push({
      name: 'global_search',
      description: `Search across all entity types simultaneously using hybrid search (text + semantic). Returns results grouped by entity type.

REQUIRED PARAMETERS:
- query (string): MANDATORY - The search term to look for across all entities. You MUST ALWAYS provide this parameter.

HOW TO USE:
1. When user asks about a specific entity by name/term (entity type unknown):
   - Extract the name/term from user's question
   - Call with: {"query": "extracted_term", "limit": 10}
   - Examples:
     * User: "cerca se ho un contatto che si chiama Bianchi" → {"query": "Bianchi", "limit": 10}
     * User: "trova Mario Rossi" → {"query": "Mario Rossi", "limit": 10}
     * User: "dammi i dati di aleksandra" → {"query": "aleksandra", "limit": 10}

2. When user asks for count or all items:
   - Use: {"query": "*", "count_only": true} for count
   - Use: {"query": "*", "limit": 50} for all items

CRITICAL RULES:
- NEVER call this tool with empty arguments {} or without query parameter
- ALWAYS extract search terms from user's question and pass as "query"
- If user mentions a name/term, extract it and use it as query value
- Use this tool when entity type is unknown, otherwise use specific search_<entity> tool

OPTIONAL PARAMETERS:
- type: 'text' | 'semantic' | 'hybrid' (default: 'hybrid')
- limit: number (default: 10) - results per entity type
- count_only: boolean (default: false)`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: `REQUIRED: Search query string. Extract this from user's question. Examples: If user says "cerca Bianchi" → use "Bianchi". If user says "trova Mario Rossi" → use "Mario Rossi" or "Mario" or "Rossi". Use "*" ONLY when user asks for all items or count.`,
          },
          type: {
            type: 'string',
            enum: ['text', 'semantic', 'hybrid'],
            description: 'Search type',
            default: 'hybrid',
          },
          limit: {
            type: 'number',
            description: 'Result limit per entity type',
            default: 10,
          },
          count_only: {
            type: 'boolean',
            description: 'If true, return only counts per entity type without results',
            default: false,
          },
        },
        required: ['query'],
      },
    });

    return tools;
  }

  /**
   * Generate a view link for an entity
   */
  private generateEntityViewLink(entityType: string, entityId: string): string {
    return `/entities/${entityType}/${entityId}`;
  }

  /**
   * Add view links to search results
   */
  private addViewLinksToResults(
    results: unknown[],
    entityType: string
  ): Array<Record<string, unknown> & { view_link?: string }> {
    return results.map((result: unknown) => {
      const resultObj = result as Record<string, unknown>;
      // Try multiple ID field names (Typesense uses 'id', MongoDB uses '_id')
      const id =
        resultObj._id ||
        resultObj.id ||
        (resultObj as { document?: { id?: string; _id?: string } }).document?.id ||
        (resultObj as { document?: { id?: string; _id?: string } }).document?._id;

      if (id && typeof id === 'string') {
        const enhanced = {
          ...resultObj,
          view_link: this.generateEntityViewLink(entityType, id),
          // Add prominent link field for LLM visibility
          '🔗 VIEW_LINK': this.generateEntityViewLink(entityType, id),
        };
        return enhanced;
      }

      // If no ID found, return as-is but log warning
      console.warn(`[MCP Server] No ID found in result for ${entityType}:`, Object.keys(resultObj));
      return resultObj;
    });
  }

  private buildEntityProperties(entity: {
    fields: Array<{
      name: string;
      label?: string;
      type: string;
      required: boolean;
      validation?: { enum?: unknown[]; [key: string]: unknown };
      default?: unknown;
      description?: string;
      reference_entity?: string;
      multiple?: boolean;
    }>;
  }): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    for (const field of entity.fields) {
      const schema: Record<string, unknown> = {};
      const fieldLabel = field.label || field.name;

      // Set type based on field type
      switch (field.type) {
        case 'string':
        case 'text':
          schema.type = 'string';
          break;
        case 'email':
          schema.type = 'string';
          schema.format = 'email';
          schema.description = 'Email address in format user@example.com';
          break;
        case 'url':
          schema.type = 'string';
          schema.format = 'uri';
          schema.description =
            'Website URL in valid format: https://www.example.com (must include https:// protocol and full domain)';
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
          schema.description =
            'Date in ISO 8601 date format (YYYY-MM-DD). Example: "2024-01-15". The backend will convert this to a datetime value at midnight UTC.';
          break;
        case 'datetime':
          schema.type = 'string';
          schema.format = 'date-time';
          schema.description =
            'Date and time in ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ. Examples: "2024-01-15T14:30:00.000Z" (UTC), "2024-01-15T14:30:00Z" (UTC), or "2024-01-15T14:30:00" (local time, will be interpreted as UTC). Always use UTC timezone (Z suffix) for consistency.';
          break;
        case 'reference':
          schema.type = 'string';
          schema.description = `Reference to ${(field as { reference_entity?: string }).reference_entity || 'entity'} ID`;
          break;
        default:
          schema.type = 'string';
      }

      // Handle enum validation
      if (field.validation?.enum && Array.isArray(field.validation.enum)) {
        schema.enum = field.validation.enum;
        schema.description =
          ((schema.description as string) || '') + ` (enum: ${field.validation.enum.join(', ')})`;
      }

      // Add default value if present
      if (field.default !== undefined) {
        schema.default = field.default;
      }

      // Add field description if present
      if (field.description) {
        schema.description = field.description;
      }

      schema.title = fieldLabel;

      if (field.multiple === true) {
        const { enum: enumValues, description, ...rest } = schema;
        const itemSchema: Record<string, unknown> = { ...rest };
        if (enumValues) {
          itemSchema.enum = enumValues;
        }

        const arraySchema: Record<string, unknown> = {
          type: 'array',
          items: Object.keys(itemSchema).length > 0 ? itemSchema : {},
          title: fieldLabel,
        };

        if (description) {
          arraySchema.description = `${description} (multiple values allowed)`;
        } else {
          arraySchema.description = 'Multiple values allowed';
        }

        properties[field.name] = arraySchema;
        continue;
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

        // Immediately index the newly created entity in Typesense/Qdrant
        try {
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          const tenantConfig = await this.configLoader.getTenant(tenantId);
          if (entityDef) {
            const createdRecord = created as unknown as Record<string, unknown>;
            await indexEntityInSearch(
              ctx,
              entity,
              entityDef,
              createdRecord,
              tenantConfig || undefined
            );
          }
        } catch (error) {
          // Do not fail the MCP tool call if indexing fails; log to stderr for debugging
          // eslint-disable-next-line no-console
          console.error(
            '[MCPServer] Failed to index entity created via MCP',
            entity,
            (error as Error)?.message || String(error)
          );
        }

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
        const query = (args.query as string) || '*';
        const limit = (args.limit as number) || 10;
        const countOnly = (args.count_only as boolean) || false;

        // Normalize wildcard query
        const normalizedQuery = query.trim() === '' || query.trim() === '*' ? '*' : query;

        // For wildcard queries, use only text search (semantic search doesn't make sense)
        const useSemanticSearch =
          normalizedQuery !== '*' && (searchType === 'semantic' || searchType === 'hybrid');

        if (useSemanticSearch) {
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
              const [queryVector] = await provider.embedTexts([normalizedQuery]);

              const results = await searchQdrant(tenantId, entity, {
                vector: queryVector,
                limit: countOnly ? 0 : limit, // If count only, don't fetch results
                filter: {
                  must: [
                    { key: 'tenant_id', match: { value: tenantId } },
                    { key: 'unit_id', match: { value: unitId } },
                  ],
                },
              });

              // For semantic search, we need to get count from text search
              // since Qdrant doesn't provide total count easily
              if (countOnly) {
                const textResults = await search(ctx, entity, {
                  q: normalizedQuery,
                  per_page: 0, // Just get count
                  page: 1,
                });

                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(
                        {
                          count: textResults.found,
                          entity,
                          query: normalizedQuery,
                        },
                        null,
                        2
                      ),
                    },
                  ],
                  isError: false,
                };
              }

              // Add view links to semantic search results
              const resultsWithLinks = results.map((result: unknown) => {
                const resultObj = result as { id?: string; payload?: { document_id?: string } };
                const docId = resultObj.id || resultObj.payload?.document_id;
                if (docId && typeof docId === 'string') {
                  return {
                    ...resultObj,
                    view_link: this.generateEntityViewLink(entity, docId),
                  };
                }
                return resultObj;
              });

              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        results: resultsWithLinks,
                        entity,
                        query: normalizedQuery,
                      },
                      null,
                      2
                    ),
                  },
                ],
                isError: false,
              };
            }
          }
        }

        // Text search (or fallback for wildcard queries)
        const searchLimit = countOnly ? 0 : limit; // If count only, don't fetch results
        const results = await search(ctx, entity, {
          q: normalizedQuery,
          per_page: searchLimit,
          page: 1,
        });

        if (countOnly) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    count: results.found,
                    entity,
                    query: normalizedQuery,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
        }

        // Add view links to results
        const resultsWithLinks = this.addViewLinksToResults(results.hits, entity);

        // Create response with prominent link information
        const response = {
          results: resultsWithLinks,
          count: results.found,
          page: results.page,
          entity,
          query: normalizedQuery,
          // Add summary with links for better LLM visibility
          links_summary: resultsWithLinks
            .filter((r) => r.view_link)
            .map((r) => ({
              id: r._id || r.id,
              name: (r as { name?: string }).name || 'Entity',
              view_link: r.view_link,
            })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
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

        // Add view link to entity with prominent display
        const docWithLink = {
          ...doc,
          view_link: this.generateEntityViewLink(entity, id),
          '🔗 VIEW_LINK': this.generateEntityViewLink(entity, id),
          _IMPORTANT: `This ${entity} can be viewed at: ${this.generateEntityViewLink(entity, id)}`,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(docWithLink, null, 2),
            },
          ],
          isError: false,
        };
      }

      if (action === 'update') {
        const id = args.id as string;
        const confirmed = (args.confirmed as boolean) || false;

        // Validate ID is provided
        if (!id || id.trim() === '') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'ID is required',
                    message: `Cannot execute UPDATE operation without an ID for ${entity}.`,
                    action_required: 'SEARCH_FOR_ID',
                    instructions: [
                      `If you know this is a ${entity}, use search_${entity} with a descriptive query to find the entity ID.`,
                      `If you're not sure about the entity type, use global_search to find both the entity type and ID.`,
                      `Once you have the ID, call update_${entity} again with the ID and your changes.`,
                    ],
                    suggested_tools: [
                      {
                        tool: `search_${entity}`,
                        description: `Search for ${entity} entities to find the ID`,
                        example: { query: 'descriptive search query', limit: 10 },
                      },
                      {
                        tool: 'global_search',
                        description: 'Search across all entity types if entity type is unknown',
                        example: { query: 'descriptive search query', limit: 10 },
                      },
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Extract id and confirmed from args and pass the rest as update data
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, confirmed: __, ...updateData } = args;

        // If not confirmed, return preview and require confirmation
        if (!confirmed) {
          // Get current entity state
          const currentEntity = await this.repository.findById(ctx, entity, id);
          if (!currentEntity) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Entity not found' }, null, 2),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    requires_confirmation: true,
                    action: 'UPDATE',
                    entity_type: entity,
                    entity_id: id,
                    current_state: currentEntity,
                    proposed_changes: updateData,
                    message: `⚠️ DESTRUCTIVE ACTION REQUIRES CONFIRMATION ⚠️\n\nYou are about to UPDATE ${entity} with ID: ${id}\n\nCurrent state:\n${JSON.stringify(currentEntity, null, 2)}\n\nProposed changes:\n${JSON.stringify(updateData, null, 2)}\n\n⚠️ This action will modify the entity. To proceed, call this tool again with confirmed=true`,
                    confirmation_required: true,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
        }

        // Execute update with confirmation
        const updated = await this.repository.update(ctx, entity, id, updateData);

        // Re-index updated entity so search/RAG can see the changes
        try {
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          const tenantConfig = await this.configLoader.getTenant(tenantId);
          if (entityDef && updated) {
            const updatedRecord = updated as unknown as Record<string, unknown>;
            await indexEntityInSearch(
              ctx,
              entity,
              entityDef,
              updatedRecord,
              tenantConfig || undefined
            );
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            '[MCPServer] Failed to re-index entity updated via MCP',
            entity,
            id,
            (error as Error)?.message || String(error)
          );
        }

        if (!updated) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Not found or update failed' }, null, 2),
              },
            ],
            isError: true,
          };
        }

        // Add view link to updated entity
        const updatedWithLink = {
          ...updated,
          view_link: this.generateEntityViewLink(entity, id),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  action: 'UPDATE',
                  entity_type: entity,
                  entity_id: id,
                  updated_entity: updatedWithLink,
                  view_link: this.generateEntityViewLink(entity, id),
                  message: `${entity} with ID ${id} has been successfully updated`,
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        };
      }

      if (action === 'delete') {
        const id = args.id as string;
        const confirmed = (args.confirmed as boolean) || false;

        // Validate ID is provided
        if (!id || id.trim() === '') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: 'ID is required',
                    message: `Cannot execute DELETE operation without an ID for ${entity}.`,
                    action_required: 'SEARCH_FOR_ID',
                    instructions: [
                      `If you know this is a ${entity}, use search_${entity} with a descriptive query to find the entity ID.`,
                      `If you're not sure about the entity type, use global_search to find both the entity type and ID.`,
                      `Once you have the ID, call delete_${entity} again with the ID.`,
                    ],
                    suggested_tools: [
                      {
                        tool: `search_${entity}`,
                        description: `Search for ${entity} entities to find the ID`,
                        example: { query: 'descriptive search query', limit: 10 },
                      },
                      {
                        tool: 'global_search',
                        description: 'Search across all entity types if entity type is unknown',
                        example: { query: 'descriptive search query', limit: 10 },
                      },
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // If not confirmed, return preview and require confirmation
        if (!confirmed) {
          // Get current entity state
          const currentEntity = await this.repository.findById(ctx, entity, id);
          if (!currentEntity) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Entity not found' }, null, 2),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    requires_confirmation: true,
                    action: 'DELETE',
                    entity_type: entity,
                    entity_id: id,
                    entity_to_delete: currentEntity,
                    message: `⚠️ DESTRUCTIVE ACTION REQUIRES CONFIRMATION ⚠️\n\nYou are about to DELETE ${entity} with ID: ${id}\n\nEntity to be deleted:\n${JSON.stringify(currentEntity, null, 2)}\n\n⚠️ This action is IRREVERSIBLE and will permanently delete the entity. To proceed, call this tool again with confirmed=true`,
                    confirmation_required: true,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          };
        }

        // Execute delete with confirmation
        const deleted = await this.repository.delete(ctx, entity, id);

        // Remove entity from search indexes
        try {
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          if (entityDef && deleted) {
            await removeEntityFromSearch(ctx, entity, id, entityDef);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(
            '[MCPServer] Failed to remove entity from search indexes via MCP',
            entity,
            id,
            (error as Error)?.message || String(error)
          );
        }

        if (!deleted) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Not found or delete failed' }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  action: 'DELETE',
                  entity_type: entity,
                  entity_id: id,
                  message: `${entity} with ID ${id} has been successfully deleted`,
                  note: 'Entity has been deleted and is no longer accessible',
                },
                null,
                2
              ),
            },
          ],
          isError: false,
        };
      }

      // Global search across all entities
      if (name === 'global_search') {
        return this.globalSearch(ctx, args);
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
   * Global search across all entities
   */
  private async globalSearch(
    ctx: TenantContext,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
      const query = args.query as string;
      const searchType = (args.type as string) || 'hybrid';
      const limit = (args.limit as number) || 10;
      const countOnly = (args.count_only as boolean) || false;

      // Normalize wildcard query
      const normalizedQuery = query.trim() === '' || query.trim() === '*' ? '*' : query;

      // Get all entities for this tenant/unit
      const entities = await this.configLoader.getEntities(ctx);
      const results: Array<{ entity: string; items: unknown[]; count: number }> = [];

      // Search each entity type
      for (const entityDef of entities) {
        try {
          const entityName = entityDef.name;

          // Use text search for global search (simpler and more reliable across all entities)
          const searchLimit = countOnly ? 0 : limit;
          const searchResults = await search(ctx, entityName, {
            q: normalizedQuery,
            per_page: searchLimit,
            page: 1,
          });

          if (searchResults.hits && searchResults.hits.length > 0) {
            // Map hits to ensure consistent structure and add view links
            const mappedItems = searchResults.hits.map((hit: unknown) => {
              const hitObj = hit as {
                document?: { id?: string; _id?: string; [key: string]: unknown };
                id?: string;
                _id?: string;
                [key: string]: unknown;
              };
              // Typesense returns documents directly or wrapped in document property
              let mappedItem: Record<string, unknown>;
              if (hitObj.document) {
                const doc = hitObj.document as {
                  id?: string;
                  _id?: string;
                  [key: string]: unknown;
                };
                mappedItem = { ...doc, _id: doc.id || doc._id };
              } else {
                mappedItem = { ...hitObj, _id: hitObj.id || hitObj._id };
              }

              // Add view link
              const id = mappedItem._id || mappedItem.id;
              if (id && typeof id === 'string') {
                mappedItem.view_link = this.generateEntityViewLink(entityName, id);
              }

              return mappedItem;
            });

            results.push({
              entity: entityName,
              items: mappedItems,
              count: searchResults.found,
            });
          } else if (searchResults.found > 0) {
            // If count_only is true, we still want to include entities with matches
            results.push({
              entity: entityName,
              items: [],
              count: searchResults.found,
            });
          }
        } catch (error) {
          // Skip entities that fail to search (log but don't fail entire search)
          console.warn(`Global search failed for entity ${entityDef.name}:`, error);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query: normalizedQuery,
                searchType,
                results,
                totalEntities: results.length,
                totalCount: results.reduce((sum, r) => sum + r.count, 0),
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
