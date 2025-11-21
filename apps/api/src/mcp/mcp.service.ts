import { Injectable, Inject, Optional, forwardRef, Logger } from '@nestjs/common';
import { getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { EntityRepository } from '@crm-atlas/db';
import { search, searchQdrant } from '@crm-atlas/search';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import { getEmbeddableFields } from '@crm-atlas/utils';
import type { TenantContext } from '@crm-atlas/core';
import { EntitiesService } from '../entities/entities.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);
  private configLoader: MongoConfigLoader;
  private repository: EntityRepository;

  constructor(
    private readonly entitiesService: EntitiesService,
    @Optional()
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService?: WorkflowsService
  ) {
    this.configLoader = new MongoConfigLoader(getDb());
    this.repository = new EntityRepository();
  }

  async listTools(
    tenantId: string,
    unitId: string
  ): Promise<Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>> {
    // Clear entities cache before generating tools to ensure we have the latest entity schemas
    // This ensures that after a sync, the MCP tools reflect the updated schemas
    this.configLoader.clearEntitiesCache(tenantId);

    const units = await this.configLoader.getUnits(tenantId);
    const entities = await this.configLoader.getEntities({
      tenant_id: tenantId,
      unit_id: unitId || units[0]?.unit_id || '',
    });

    const tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> = [];

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
        description: `Search for ${entityLabel} using text or semantic search. Use '*' as query for generic search (all results). Set count_only to true to get only the count without results.`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query. Use "*" for generic search (all results)',
              default: '*',
            },
            type: {
              type: 'string',
              enum: ['text', 'semantic', 'hybrid'],
              description: 'Search type',
              default: 'hybrid',
            },
            limit: { type: 'number', description: 'Result limit', default: 10 },
            count_only: {
              type: 'boolean',
              description: 'If true, return only the count without results',
              default: false,
            },
          },
          required: [],
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
    }

    // Add workflow tools
    if (this.workflowsService) {
      tools.push(
        {
          name: 'workflow_list',
          description: 'List all workflows for a tenant/unit',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'workflow_get',
          description: 'Get a workflow by ID',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'string', description: 'Workflow ID' },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'workflow_create',
          description: 'Create a new workflow',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'object',
                description: 'Workflow definition',
              },
            },
            required: ['workflow'],
          },
        },
        {
          name: 'workflow_update',
          description: 'Update an existing workflow',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'string', description: 'Workflow ID' },
              workflow: {
                type: 'object',
                description: 'Workflow updates',
              },
            },
            required: ['workflow_id', 'workflow'],
          },
        },
        {
          name: 'workflow_delete',
          description: 'Delete a workflow',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'string', description: 'Workflow ID' },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'workflow_trigger',
          description: 'Trigger a workflow manually',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'string', description: 'Workflow ID' },
              context: {
                type: 'object',
                description: 'Context data for workflow execution',
              },
            },
            required: ['workflow_id'],
          },
        },
        {
          name: 'workflow_status',
          description: 'Get workflow status and statistics',
          inputSchema: {
            type: 'object',
            properties: {
              workflow_id: { type: 'string', description: 'Workflow ID' },
            },
            required: ['workflow_id'],
          },
        }
      );
    }

    // Global search tool - search across all entities
    tools.push({
      name: 'global_search',
      description:
        'Search across all entity types simultaneously using hybrid search (text + semantic). Returns results grouped by entity type.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find across all entities',
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
      this.logger.warn(`No ID found in result for ${entityType}`, { keys: Object.keys(resultObj) });
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
          schema.description = `Reference to ${field.reference_entity || 'entity'} ID`;
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

  /**
   * Validate tool arguments against schema
   */
  private validateToolArgs(
    _toolName: string,
    args: Record<string, unknown>,
    schema: { properties?: Record<string, unknown>; required?: string[] }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args) || args[field] === undefined || args[field] === null) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    // Validate field types
    if (schema.properties) {
      for (const [field, value] of Object.entries(args)) {
        const prop = schema.properties[field] as
          | {
              type?: string;
              enum?: unknown[];
              description?: string;
              items?: Record<string, unknown>;
            }
          | undefined;

        if (prop) {
          if (prop.type === 'array') {
            if (!Array.isArray(value)) {
              errors.push(`Field '${field}' must be an array, got ${typeof value}`);
              continue;
            }

            const itemSchema = prop.items || {};
            const itemType = itemSchema.type as string | undefined;
            const itemEnum = Array.isArray(itemSchema.enum)
              ? (itemSchema.enum as unknown[])
              : undefined;

            for (const item of value) {
              if (itemEnum && !itemEnum.includes(item)) {
                errors.push(
                  `Field '${field}' has invalid value '${item}'. Must be one of: ${itemEnum.join(', ')}`
                );
              }
              if (itemType && typeof item !== itemType) {
                errors.push(
                  `Field '${field}' array items must be of type ${itemType}, got ${typeof item}`
                );
              }
            }

            continue;
          }

          // Check enum values
          if (prop.enum && Array.isArray(prop.enum) && !prop.enum.includes(value)) {
            errors.push(
              `Field '${field}' has invalid value '${value}'. Must be one of: ${prop.enum.join(', ')}`
            );
          }

          // Check type (basic validation)
          if (prop.type) {
            const expectedType = prop.type;
            const actualType = typeof value;

            if (expectedType === 'string' && actualType !== 'string') {
              errors.push(`Field '${field}' must be a string, got ${actualType}`);
            } else if (expectedType === 'number' && actualType !== 'number') {
              errors.push(`Field '${field}' must be a number, got ${actualType}`);
            } else if (expectedType === 'boolean' && actualType !== 'boolean') {
              errors.push(`Field '${field}' must be a boolean, got ${actualType}`);
            } else if (expectedType === 'array' && !Array.isArray(value)) {
              errors.push(`Field '${field}' must be an array, got ${actualType}`);
            } else if (
              expectedType === 'object' &&
              (actualType !== 'object' || Array.isArray(value))
            ) {
              errors.push(`Field '${field}' must be an object, got ${actualType}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get tool schema for validation
   * This method builds the schema directly without calling listTools to avoid recursion
   */
  private async getToolSchema(
    tenantId: string,
    unitId: string,
    toolName: string
  ): Promise<{ properties?: Record<string, unknown>; required?: string[] } | null> {
    try {
      // Handle special tools
      if (toolName === 'global_search') {
        return {
          properties: {
            query: { type: 'string', default: '*' },
            type: { type: 'string', enum: ['text', 'semantic', 'hybrid'], default: 'hybrid' },
            limit: { type: 'number', default: 10 },
            count_only: { type: 'boolean', default: false },
          },
          required: [],
        };
      }

      if (toolName.startsWith('workflow_')) {
        // Workflow tools have different schemas - skip validation for now
        return null;
      }

      // For entity tools, build schema directly
      const [action, entity] = toolName.split('_', 2);
      if (!action || !entity) {
        return null;
      }

      const units = await this.configLoader.getUnits(tenantId);
      const entities = await this.configLoader.getEntities({
        tenant_id: tenantId,
        unit_id: unitId || units[0]?.unit_id || '',
      });

      const entityDef = entities.find((e) => e.name === entity);
      if (!entityDef) {
        return null;
      }

      // Build schema based on action
      if (action === 'create') {
        return {
          properties: this.buildEntityProperties(entityDef),
          required: entityDef.fields
            .filter((f: { required: boolean }) => f.required)
            .map((f: { name: string }) => f.name),
        };
      }

      if (action === 'search') {
        return {
          properties: {
            query: { type: 'string', default: '*' },
            type: { type: 'string', enum: ['text', 'semantic', 'hybrid'], default: 'hybrid' },
            limit: { type: 'number', default: 10 },
            count_only: { type: 'boolean', default: false },
          },
          required: [],
        };
      }

      if (action === 'get') {
        return {
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        };
      }

      if (action === 'update') {
        return {
          properties: {
            id: { type: 'string' },
            confirmed: { type: 'boolean', default: false },
            ...this.buildEntityProperties(entityDef),
          },
          required: ['id'],
        };
      }

      if (action === 'delete') {
        return {
          properties: {
            id: { type: 'string' },
            confirmed: { type: 'boolean', default: false },
          },
          required: ['id'],
        };
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to get tool schema for ${toolName}:`, error);
      return null;
    }
  }

  async callTool(
    tenantId: string,
    unitId: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
      // Validate tool name format
      if (!name || name.trim() === '') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Tool name is required' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Get and validate tool schema (for non-workflow and non-global_search tools)
      if (!name.startsWith('workflow_') && name !== 'global_search') {
        const schema = await this.getToolSchema(tenantId, unitId, name);
        if (schema) {
          const validation = this.validateToolArgs(name, args, schema);
          if (!validation.valid) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: 'Invalid tool arguments',
                      validation_errors: validation.errors,
                      tool: name,
                      provided_args: args,
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
      }

      const [action, entity] = name.split('_', 2);
      const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };

      if (action === 'create') {
        // Use EntitiesService to ensure proper indexing in Typesense and Qdrant
        const created = await this.entitiesService.create(ctx, entity, args);
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

              // Debug logging
              this.logger.debug('Embeddings config', {
                provider: globalConfig.name,
                hasApiKey: !!globalConfig.apiKey,
                apiKeyLength: globalConfig.apiKey?.length,
                apiKeyPrefix: globalConfig.apiKey?.substring(0, 7) + '...',
                tenantOverride: tenantConfig?.embeddingsProvider
                  ? {
                      name: tenantConfig.embeddingsProvider.name,
                      hasApiKey: !!tenantConfig.embeddingsProvider.apiKey,
                    }
                  : null,
                envVar: process.env.OPENAI_API_KEY ? 'present' : 'missing',
              });

              const provider = createEmbeddingsProvider(
                globalConfig,
                tenantConfig?.embeddingsProvider
              );
              const [queryVector] = await provider.embedTexts([normalizedQuery]);

              const semanticResults = await searchQdrant(tenantId, entity, {
                vector: queryVector,
                limit: countOnly ? 0 : limit, // If count only, don't fetch results
                filter: {
                  must: [
                    { key: 'tenant_id', match: { value: tenantId } },
                    { key: 'unit_id', match: { value: unitId } },
                  ],
                },
              });

              // For count only, get count from text search (Qdrant doesn't provide total count easily)
              if (countOnly) {
                const textResults = await search(
                  ctx,
                  entity,
                  {
                    q: normalizedQuery,
                    per_page: 0, // Just get count
                    page: 1,
                  },
                  entityDef
                );

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

              this.logger.debug(`Semantic search results for ${entity}`, {
                query: normalizedQuery,
                resultsCount: semanticResults.length,
                results: semanticResults.slice(0, 2), // Log first 2 results
              });

              // For semantic-only search: if no results, fallback to text search
              if (searchType === 'semantic' && semanticResults.length === 0) {
                this.logger.debug('No semantic results, falling back to text search');
                const textResults = await search(
                  ctx,
                  entity,
                  {
                    q: normalizedQuery,
                    per_page: limit,
                    page: 1,
                  },
                  entityDef
                );
                // Add view links to results
                const textResultsWithLinks = this.addViewLinksToResults(textResults.hits, entity);
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(
                        {
                          results: textResultsWithLinks,
                          count: textResults.found,
                          page: textResults.page,
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

              // For hybrid search: combine semantic and text results
              if (searchType === 'hybrid') {
                const textResults = await search(
                  ctx,
                  entity,
                  {
                    q: normalizedQuery,
                    per_page: limit,
                    page: 1,
                  },
                  entityDef
                );

                // Combine results: prioritize semantic, add text results not in semantic
                const semanticIds = new Set(semanticResults.map((r) => String(r.id)));
                const combinedResults = [
                  ...semanticResults.map((r) => ({
                    id: r.id,
                    score: r.score,
                    payload: r.payload,
                    source: 'semantic' as const,
                  })),
                  ...textResults.hits
                    .filter((h) => {
                      const id = String(
                        (h as { id?: string; _id?: string }).id ||
                          (h as { id?: string; _id?: string })._id
                      );
                      return !semanticIds.has(id);
                    })
                    .map((h) => ({
                      id:
                        (h as { id?: string; _id?: string }).id ||
                        (h as { id?: string; _id?: string })._id,
                      score: 0.5, // Lower score for text-only results
                      payload: h as Record<string, unknown>,
                      source: 'text' as const,
                    })),
                ].slice(0, limit);

                this.logger.debug(`Hybrid search results for ${entity}`, {
                  query: normalizedQuery,
                  semanticCount: semanticResults.length,
                  textCount: textResults.hits.length,
                  combinedCount: combinedResults.length,
                });

                // Add view links to combined results
                const combinedResultsWithLinks = combinedResults.map((result: unknown) => {
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
                          results: combinedResultsWithLinks,
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

              // Pure semantic search with results - add view links
              const semanticResultsWithLinks = semanticResults.map((result: unknown) => {
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
                        results: semanticResultsWithLinks,
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

        // Fallback to text search
        // Load entity definition to determine scope (tenant vs unit)
        const entityDef = await this.configLoader.getEntity(ctx, entity);
        if (!entityDef) {
          this.logger.warn(
            `Entity definition not found for ${entity}, tenant: ${tenantId}, unit: ${unitId}. Will try global collection first.`
          );
        } else {
          this.logger.debug(`Entity definition found for ${entity}, scope: ${entityDef.scope}`);
        }
        const searchLimit = countOnly ? 0 : limit; // If count only, don't fetch results

        // Log search parameters for debugging
        this.logger.debug(`[Search] Calling search function`, {
          entity,
          tenantId,
          unitId,
          query: normalizedQuery,
          hasEntityDef: !!entityDef,
          entityDefScope: entityDef?.scope,
          searchLimit,
        });

        const results = await search(
          ctx,
          entity,
          {
            q: normalizedQuery,
            per_page: searchLimit,
            page: 1,
          },
          entityDef || undefined
        );

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

        this.logger.debug(`Text search results for ${entity}`, {
          query: normalizedQuery,
          found: results.found,
          hitsCount: results.hits.length,
          hits: results.hits.slice(0, 2).map((h: { id?: string; name?: string }) => ({
            id: h.id,
            name: h.name,
          })),
        });

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
        // Load entity definition to determine scope (tenant vs unit)
        const entityDef = await this.configLoader.getEntity(ctx, entity);
        if (!entityDef) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Entity definition not found' }, null, 2),
              },
            ],
            isError: true,
          };
        }
        const doc = await this.repository.findById(ctx, entity, id, entityDef);

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
          // Load entity definition to determine scope (tenant vs unit)
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          if (!entityDef) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Entity definition not found' }, null, 2),
                },
              ],
              isError: true,
            };
          }
          // Get current entity state
          const currentEntity = await this.repository.findById(ctx, entity, id, entityDef);
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

        // Execute update with confirmation - Use EntitiesService to ensure proper indexing
        const updated = await this.entitiesService.update(ctx, entity, id, updateData);

        // Add view link to updated entity
        const updatedWithLink = {
          ...(updated as Record<string, unknown>),
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
          // Load entity definition to determine scope (tenant vs unit)
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          if (!entityDef) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'Entity definition not found' }, null, 2),
                },
              ],
              isError: true,
            };
          }
          // Get current entity state
          const currentEntity = await this.repository.findById(ctx, entity, id, entityDef);
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

        // Execute delete with confirmation - Use EntitiesService to ensure proper cleanup
        await this.entitiesService.delete(ctx, entity, id);

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
        const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };
        return this.globalSearch(ctx, args);
      }

      // Handle workflow tools
      if (name.startsWith('workflow_')) {
        if (!this.workflowsService) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'WorkflowsService not available' }, null, 2),
              },
            ],
            isError: true,
          };
        }

        const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };
        const workflowAction = name.substring('workflow_'.length);

        try {
          switch (workflowAction) {
            case 'list': {
              const workflows = await this.workflowsService.getWorkflows(ctx);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(workflows, null, 2),
                  },
                ],
                isError: false,
              };
            }

            case 'get': {
              const workflowId = args.workflow_id as string;
              if (!workflowId) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'workflow_id is required' }, null, 2),
                    },
                  ],
                  isError: true,
                };
              }
              const workflow = await this.workflowsService.getWorkflow(ctx, workflowId);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(workflow, null, 2),
                  },
                ],
                isError: false,
              };
            }

            case 'create': {
              const workflow = args.workflow as Record<string, unknown>;
              if (!workflow) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'workflow is required' }, null, 2),
                    },
                  ],
                  isError: true,
                };
              }
              const created = await this.workflowsService.createWorkflow(ctx, workflow as any);
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

            case 'update': {
              const workflowId = args.workflow_id as string;
              const workflow = args.workflow as Record<string, unknown>;
              if (!workflowId || !workflow) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(
                        { error: 'workflow_id and workflow are required' },
                        null,
                        2
                      ),
                    },
                  ],
                  isError: true,
                };
              }
              const updated = await this.workflowsService.updateWorkflow(
                ctx,
                workflowId,
                workflow as any
              );
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(updated, null, 2),
                  },
                ],
                isError: false,
              };
            }

            case 'delete': {
              const workflowId = args.workflow_id as string;
              if (!workflowId) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'workflow_id is required' }, null, 2),
                    },
                  ],
                  isError: true,
                };
              }
              await this.workflowsService.deleteWorkflow(ctx, workflowId);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({ success: true, message: 'Workflow deleted' }, null, 2),
                  },
                ],
                isError: false,
              };
            }

            case 'trigger': {
              const workflowId = args.workflow_id as string;
              const context = (args.context as Record<string, unknown>) || {};
              if (!workflowId) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'workflow_id is required' }, null, 2),
                    },
                  ],
                  isError: true,
                };
              }
              const result = await this.workflowsService.triggerWorkflow(ctx, workflowId, context);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                  },
                ],
                isError: false,
              };
            }

            case 'status': {
              const workflowId = args.workflow_id as string;
              if (!workflowId) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({ error: 'workflow_id is required' }, null, 2),
                    },
                  ],
                  isError: true,
                };
              }
              const stats = await this.workflowsService.getWorkflowStats(ctx, workflowId);
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(stats, null, 2),
                  },
                ],
                isError: false,
              };
            }

            default:
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      { error: `Unknown workflow action: ${workflowAction}` },
                      null,
                      2
                    ),
                  },
                ],
                isError: true,
              };
          }
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
      this.logger.debug(`[GlobalSearch] Searching across ${entities.length} entities:`, {
        entities: entities.map((e) => e.name),
        query: normalizedQuery,
        searchType,
      });

      const results: Array<{ entity: string; items: unknown[]; count: number }> = [];

      // Determine if we should use semantic search
      const useSemanticSearch =
        normalizedQuery !== '*' && (searchType === 'semantic' || searchType === 'hybrid');

      // Get embeddings provider if needed
      let queryVector: number[] | null = null;
      if (useSemanticSearch) {
        try {
          const tenantConfig = await this.configLoader.getTenant(ctx.tenant_id);
          const globalConfig = getProviderConfig();
          const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);
          const vectors = await provider.embedTexts([normalizedQuery]);
          queryVector = vectors[0];
          this.logger.debug('[GlobalSearch] Generated query vector for semantic search');
        } catch (error) {
          this.logger.warn(
            '[GlobalSearch] Failed to generate embeddings, falling back to text search',
            error instanceof Error ? error.message : String(error)
          );
          // Fallback to text search if embeddings fail
        }
      }

      // Search each entity type
      for (const entityDef of entities) {
        try {
          const entityName = entityDef.name;
          const searchLimit = countOnly ? 0 : limit;
          let searchResults: { hits: unknown[]; found: number; page: number } | null = null;

          // Try semantic/hybrid search if enabled and query vector is available
          if (useSemanticSearch && queryVector) {
            const embeddableFields = getEmbeddableFields(entityDef);
            if (embeddableFields.length > 0) {
              try {
                const semanticResults = await searchQdrant(ctx.tenant_id, entityName, {
                  vector: queryVector,
                  limit: searchLimit,
                  filter: {
                    must: [
                      { key: 'tenant_id', match: { value: ctx.tenant_id } },
                      { key: 'unit_id', match: { value: ctx.unit_id } },
                    ],
                  },
                });

                this.logger.debug(`[GlobalSearch] Semantic search for ${entityName}:`, {
                  query: normalizedQuery,
                  resultsCount: semanticResults.length,
                });

                // For hybrid search, combine with text search
                if (searchType === 'hybrid') {
                  const textResults = await search(ctx, entityName, {
                    q: normalizedQuery,
                    per_page: searchLimit,
                    page: 1,
                  });

                  // Combine results: prioritize semantic, add text results not in semantic
                  const semanticIds = new Set(semanticResults.map((r) => String(r.id)));
                  const combinedResults = [
                    ...semanticResults.map((r) => ({
                      id: r.id,
                      score: r.score,
                      payload: r.payload,
                      source: 'semantic' as const,
                    })),
                    ...textResults.hits
                      .filter((h) => {
                        const id = String(
                          (h as { id?: string; _id?: string }).id ||
                            (h as { id?: string; _id?: string })._id
                        );
                        return !semanticIds.has(id);
                      })
                      .map((h) => ({
                        id:
                          (h as { id?: string; _id?: string }).id ||
                          (h as { id?: string; _id?: string })._id,
                        score: 0.5,
                        payload: h as Record<string, unknown>,
                        source: 'text' as const,
                      })),
                  ].slice(0, limit);

                  // Convert to searchResults format
                  searchResults = {
                    hits: combinedResults.map((r) => {
                      const docId = r.id || (r.payload as { document_id?: string })?.document_id;
                      return {
                        id: docId,
                        _id: docId,
                        ...(r.payload as Record<string, unknown>),
                      };
                    }),
                    found: textResults.found,
                    page: 1,
                  };
                } else {
                  // Pure semantic search
                  searchResults = {
                    hits: semanticResults.map((r) => {
                      const docId = r.id || (r.payload as { document_id?: string })?.document_id;
                      return {
                        id: docId,
                        _id: docId,
                        ...(r.payload as Record<string, unknown>),
                      };
                    }),
                    found: semanticResults.length,
                    page: 1,
                  };
                }
              } catch (semanticError) {
                this.logger.warn(
                  `[GlobalSearch] Semantic search failed for ${entityName}, falling back to text search`,
                  semanticError instanceof Error ? semanticError.message : String(semanticError)
                );
                // Fallback to text search
              }
            }
          }

          // Fallback to text search if semantic search wasn't used or failed
          if (!searchResults) {
            searchResults = await search(ctx, entityName, {
              q: normalizedQuery,
              per_page: searchLimit,
              page: 1,
            });
            this.logger.debug(`[GlobalSearch] Text search for ${entityName}:`, {
              query: normalizedQuery,
              found: searchResults.found,
              hitsCount: searchResults.hits.length,
            });
          }

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

            this.logger.debug(`[GlobalSearch] Added results for ${entityName}:`, {
              itemsCount: mappedItems.length,
              totalFound: searchResults.found,
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
          this.logger.warn(
            `[GlobalSearch] Failed for entity ${entityDef.name}`,
            error instanceof Error ? error.stack : String(error)
          );
        }
      }

      const totalCount = results.reduce((sum, r) => sum + r.count, 0);
      this.logger.debug('[GlobalSearch] Final results:', {
        query: normalizedQuery,
        searchType,
        totalEntities: results.length,
        totalCount,
        entitiesWithResults: results.map((r) => ({ entity: r.entity, count: r.count })),
      });

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
                totalCount,
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
}
