import { Injectable, Inject, Optional, forwardRef } from '@nestjs/common';
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

  async callTool(
    tenantId: string,
    unitId: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }> {
    try {
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
        const query = args.query as string;
        const limit = (args.limit as number) || 10;

        if (searchType === 'semantic' || searchType === 'hybrid') {
          const entityDef = await this.configLoader.getEntity(ctx, entity);
          if (entityDef) {
            const embeddableFields = getEmbeddableFields(entityDef);
            if (embeddableFields.length > 0) {
              const tenantConfig = await this.configLoader.getTenant(tenantId);
              const globalConfig = getProviderConfig();

              // Debug logging
              console.log('[MCP Service] Embeddings config:', {
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
              const [queryVector] = await provider.embedTexts([query]);

              const semanticResults = await searchQdrant(tenantId, entity, {
                vector: queryVector,
                limit,
                filter: {
                  must: [
                    { key: 'tenant_id', match: { value: tenantId } },
                    { key: 'unit_id', match: { value: unitId } },
                  ],
                },
              });

              console.log(`[MCP Service] Semantic search results for ${entity}:`, {
                query,
                resultsCount: semanticResults.length,
                results: semanticResults.slice(0, 2), // Log first 2 results
              });

              // For semantic-only search: if no results, fallback to text search
              if (searchType === 'semantic' && semanticResults.length === 0) {
                console.log(`[MCP Service] No semantic results, falling back to text search`);
                const textResults = await search(ctx, entity, {
                  q: query,
                  per_page: limit,
                  page: 1,
                });
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(textResults, null, 2),
                    },
                  ],
                  isError: false,
                };
              }

              // For hybrid search: combine semantic and text results
              if (searchType === 'hybrid') {
                const textResults = await search(ctx, entity, {
                  q: query,
                  per_page: limit,
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
                      score: 0.5, // Lower score for text-only results
                      payload: h as Record<string, unknown>,
                      source: 'text' as const,
                    })),
                ].slice(0, limit);

                console.log(`[MCP Service] Hybrid search results for ${entity}:`, {
                  query,
                  semanticCount: semanticResults.length,
                  textCount: textResults.hits.length,
                  combinedCount: combinedResults.length,
                });

                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(combinedResults, null, 2),
                    },
                  ],
                  isError: false,
                };
              }

              // Pure semantic search with results
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(semanticResults, null, 2),
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

        console.log(`[MCP Service] Text search results for ${entity}:`, {
          query,
          found: results.found,
          hitsCount: results.hits.length,
          hits: results.hits.slice(0, 2).map((h: { id?: string; name?: string }) => ({
            id: h.id,
            name: h.name,
          })),
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
}
