import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getDb, EntityRepository } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import type { TenantContext } from '@crm-atlas/core';
import type { WorkflowDefinition, WorkflowExecutionLog } from '@crm-atlas/types';
// Note: WorkflowEngine and WorkflowLogger are imported from the workflow app
// These will be provided by the WorkflowsModule
import type { WorkflowEngine } from '../../../workflow/src/workflow-engine';
import { WorkflowLogger } from '../../../workflow/src/workflow-logger';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  private readonly db = getDb();
  private readonly workflowLogger = new WorkflowLogger();
  private readonly entityRepository = new EntityRepository();
  private readonly configLoader = new MongoConfigLoader(getDb());
  private workflowEngine: WorkflowEngine | null = null;

  /**
   * Set workflow engine instance (injected from module)
   */
  setWorkflowEngine(engine: WorkflowEngine): void {
    this.workflowEngine = engine;
  }

  /**
   * Get all workflows for a tenant/unit
   */
  async getWorkflows(ctx: TenantContext): Promise<WorkflowDefinition[]> {
    const config = await this.db.collection('workflows').findOne({ tenant_id: ctx.tenant_id });
    if (!config) {
      this.logger.debug(`No config found for tenant: ${ctx.tenant_id}`);
      return [];
    }
    const workflows = (config.workflows as WorkflowDefinition[]) || [];
    this.logger.debug(
      `Found ${workflows.length} workflows for tenant: ${ctx.tenant_id}, unit: ${ctx.unit_id}`
    );

    // Filter by unit_id if provided
    if (ctx.unit_id) {
      const filtered = workflows.filter((w) => !w.unit_id || w.unit_id === ctx.unit_id);
      this.logger.debug(`Filtered to ${filtered.length} workflows for unit: ${ctx.unit_id}`);
      filtered.forEach((w) => {
        this.logger.debug(
          `  - ${w.name} (workflow_id: ${w.workflow_id}, unit_id: ${w.unit_id || 'none'})`
        );
      });
      return filtered;
    }
    this.logger.debug(`Returning all ${workflows.length} workflows (no unit filter)`);
    return workflows;
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(ctx: TenantContext, workflowId: string): Promise<WorkflowDefinition> {
    const workflows = await this.getWorkflows(ctx);
    const workflow = workflows.find((w) => w.workflow_id === workflowId);
    if (!workflow) {
      // Try to find workflow across all tenants if not found in current tenant
      // This handles cases where workflow.tenant_id is null but stored in a different tenant document
      const allConfigs = await this.db.collection('workflows').find({}).toArray();
      for (const config of allConfigs) {
        const allWorkflows = (config.workflows as WorkflowDefinition[]) || [];
        const foundWorkflow = allWorkflows.find((w) => w.workflow_id === workflowId);
        if (foundWorkflow) {
          // If workflow.tenant_id is null or matches current tenant, return it
          if (!foundWorkflow.tenant_id || foundWorkflow.tenant_id === ctx.tenant_id) {
            return foundWorkflow;
          }
        }
      }
      throw new NotFoundException(`Workflow ${workflowId} not found for tenant ${ctx.tenant_id}`);
    }
    return workflow;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    ctx: TenantContext,
    workflow: Omit<
      WorkflowDefinition,
      'workflow_id' | 'tenant_id' | 'created_at' | 'updated_at'
    > & {
      workflow_id?: string;
      enabled?: boolean;
      status?: 'active' | 'inactive' | 'draft';
    }
  ): Promise<WorkflowDefinition> {
    const now = new Date().toISOString();

    // Generate workflow_id if not provided
    let workflowId = workflow.workflow_id;
    if (!workflowId) {
      // Generate a UUID for the workflow
      workflowId = randomUUID();
    }

    // Get existing workflows to check for duplicates
    const config = await this.db.collection('workflows').findOne({ tenant_id: ctx.tenant_id });
    const workflows = (config?.workflows as WorkflowDefinition[]) || [];

    // Check if workflow ID already exists (should be extremely rare with UUID, but check anyway)
    if (workflows.some((w) => w.workflow_id === workflowId)) {
      // If duplicate, generate a new UUID (should never happen, but safety check)
      workflowId = randomUUID();
    }

    const newWorkflow: WorkflowDefinition = {
      ...workflow,
      workflow_id: workflowId,
      tenant_id: ctx.tenant_id,
      unit_id: workflow.unit_id || ctx.unit_id,
      enabled: workflow.enabled !== undefined ? workflow.enabled : true,
      status: workflow.status || 'active',
      created_at: now,
      updated_at: now,
    };

    // Validate workflow
    this.validateWorkflow(newWorkflow);

    // Add new workflow
    workflows.push(newWorkflow);

    // Update config
    await this.db
      .collection('workflows')
      .updateOne({ tenant_id: ctx.tenant_id }, { $set: { workflows } }, { upsert: true });

    // Reload workflow engine if available
    if (this.workflowEngine) {
      await this.workflowEngine.start();
    }

    return newWorkflow;
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    ctx: TenantContext,
    workflowId: string,
    updates: Partial<Omit<WorkflowDefinition, 'workflow_id' | 'tenant_id' | 'created_at'>>
  ): Promise<WorkflowDefinition> {
    const config = await this.db.collection('workflows').findOne({ tenant_id: ctx.tenant_id });
    if (!config) {
      throw new NotFoundException(`Workflows config not found for tenant ${ctx.tenant_id}`);
    }

    const workflows = (config.workflows as WorkflowDefinition[]) || [];
    const index = workflows.findIndex((w) => w.workflow_id === workflowId);
    if (index === -1) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Update workflow
    // Preserve tenant_id, workflow_id, created_at - they should never be changed
    // Filter out these fields from updates
    const safeUpdates = { ...updates } as any;
    delete safeUpdates.tenant_id;
    delete safeUpdates.workflow_id;
    delete safeUpdates.created_at;
    delete safeUpdates.updated_at;
    const updatedWorkflow: WorkflowDefinition = {
      ...workflows[index],
      ...safeUpdates,
      tenant_id: workflows[index].tenant_id, // Preserve original tenant_id
      workflow_id: workflows[index].workflow_id, // Preserve original workflow_id
      created_at: workflows[index].created_at, // Preserve original created_at
      updated_at: new Date().toISOString(), // Always set to current time
    };

    // Validate workflow
    this.validateWorkflow(updatedWorkflow);

    workflows[index] = updatedWorkflow;

    // Update config
    await this.db
      .collection('workflows')
      .updateOne({ tenant_id: ctx.tenant_id }, { $set: { workflows } });

    // Reload workflow engine if available
    if (this.workflowEngine) {
      await this.workflowEngine.start();
    }

    return updatedWorkflow;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(ctx: TenantContext, workflowId: string): Promise<void> {
    const config = await this.db.collection('workflows').findOne({ tenant_id: ctx.tenant_id });
    if (!config) {
      throw new NotFoundException(`Workflows config not found for tenant ${ctx.tenant_id}`);
    }

    const workflows = (config.workflows as WorkflowDefinition[]) || [];
    const filtered = workflows.filter((w) => w.workflow_id !== workflowId);

    if (filtered.length === workflows.length) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Update config
    await this.db
      .collection('workflows')
      .updateOne({ tenant_id: ctx.tenant_id }, { $set: { workflows: filtered } });

    // Reload workflow engine if available
    if (this.workflowEngine) {
      await this.workflowEngine.start();
    }
  }

  /**
   * Update workflow status (enable/disable)
   */
  async updateWorkflowStatus(
    ctx: TenantContext,
    workflowId: string,
    status: 'active' | 'inactive' | 'draft',
    enabled?: boolean
  ): Promise<WorkflowDefinition> {
    const updates: Partial<WorkflowDefinition> = { status };
    if (enabled !== undefined) {
      updates.enabled = enabled;
    }
    return this.updateWorkflow(ctx, workflowId, updates);
  }

  /**
   * Trigger a workflow manually
   */
  async triggerWorkflow(
    ctx: TenantContext,
    workflowId: string,
    context: Record<string, unknown>,
    actor?: string
  ): Promise<{ execution_id: string; message: string }> {
    if (!this.workflowEngine) {
      throw new BadRequestException('Workflow engine not available');
    }

    try {
      const executionId = await this.workflowEngine.triggerWorkflow(
        ctx.tenant_id,
        ctx.unit_id || '',
        workflowId,
        context,
        actor
      );

      return {
        execution_id: executionId,
        message: `Workflow ${workflowId} has been queued for execution. Execution ID: ${executionId}`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to trigger workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get execution logs for a workflow
   */
  async getWorkflowExecutions(
    ctx: TenantContext,
    workflowId: string,
    limit = 100,
    offset = 0
  ): Promise<WorkflowExecutionLog[]> {
    return this.workflowLogger.getWorkflowExecutions(workflowId, ctx.tenant_id, limit, offset);
  }

  /**
   * Get execution log by ID
   */
  async getExecutionLog(logId: string): Promise<WorkflowExecutionLog> {
    const log = await this.workflowLogger.getExecutionLog(logId);
    if (!log) {
      throw new NotFoundException(`Execution log ${logId} not found`);
    }
    return log;
  }

  /**
   * Delete all execution logs for a tenant
   */
  async deleteAllExecutions(ctx: TenantContext): Promise<{ deletedCount: number }> {
    const deletedCount = await this.workflowLogger.deleteAllTenantExecutions(ctx.tenant_id);
    return { deletedCount };
  }

  /**
   * Get execution logs for a tenant
   */
  async getTenantExecutions(
    ctx: TenantContext,
    limit = 100,
    offset = 0,
    filters?: {
      workflowId?: string;
      status?: string;
      triggerType?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<WorkflowExecutionLog[]> {
    return this.workflowLogger.getTenantExecutions(ctx.tenant_id, limit, offset, filters);
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(
    ctx: TenantContext,
    workflowId: string
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    average_duration_ms: number;
    last_execution: string | null;
  }> {
    return this.workflowLogger.getWorkflowStats(workflowId, ctx.tenant_id);
  }

  /**
   * Test/simulate workflow execution without actually executing it
   */
  async testWorkflow(
    ctx: TenantContext,
    workflowId: string,
    context: Record<string, unknown>,
    userInfo?: { userId?: string; email?: string; name?: string }
  ): Promise<{
    workflow_id: string;
    workflow_name: string;
    test_info: {
      tested_by: {
        user_id?: string;
        email?: string;
        name?: string;
        tenant_id: string;
        unit_id?: string;
      };
      tested_at: string;
      context_provided: Record<string, unknown>;
    };
    trigger_evaluation: {
      would_trigger: boolean;
      reason?: string;
      trigger_type: string;
    };
    conditions_evaluation?: {
      met: boolean;
      results: Array<{
        condition: {
          field: string;
          operator: string;
          value: unknown;
        };
        result: boolean;
        field_value?: unknown;
        resolved_value?: unknown;
      }>;
    };
    actions_simulation: Array<{
      action_index: number;
      action_type: string;
      would_execute: boolean;
      validation: {
        valid: boolean;
        errors?: string[];
        warnings?: string[];
      };
      simulated_result?: unknown;
      resolved_data?: unknown;
    }>;
    summary: {
      would_execute: boolean;
      total_actions: number;
      valid_actions: number;
      invalid_actions: number;
      conditions_met: boolean;
    };
  }> {
    const workflow = await this.getWorkflow(ctx, workflowId);

    // Enhance context with entity data if entity_id and entity are provided
    const enhancedContext = await this.enhanceTestContextWithEntityData(ctx, context);

    const testResult: Awaited<ReturnType<typeof this.testWorkflow>> = {
      workflow_id: workflow.workflow_id,
      workflow_name: workflow.name,
      test_info: {
        tested_by: {
          user_id: userInfo?.userId,
          email: userInfo?.email,
          name: userInfo?.name,
          tenant_id: ctx.tenant_id,
          unit_id: ctx.unit_id,
        },
        tested_at: new Date().toISOString(),
        context_provided: { ...context },
      },
      trigger_evaluation: {
        would_trigger: false,
        trigger_type: workflow.type,
      },
      actions_simulation: [],
      summary: {
        would_execute: false,
        total_actions: workflow.actions.length,
        valid_actions: 0,
        invalid_actions: 0,
        conditions_met: false,
      },
    };

    // Evaluate trigger
    if (!workflow.enabled || workflow.status !== 'active') {
      testResult.trigger_evaluation.would_trigger = false;
      testResult.trigger_evaluation.reason = `Workflow is ${!workflow.enabled ? 'disabled' : 'inactive'}`;
      return testResult;
    }

    // For event triggers, check if context matches
    if (workflow.type === 'event' && workflow.trigger.type === 'event') {
      const eventMatch = enhancedContext.event === workflow.trigger.event;
      const entityMatch =
        !workflow.trigger.entity || enhancedContext.entity === workflow.trigger.entity;

      // For tenant_id:
      // - If workflow.tenant_id is set, it must match exactly
      // - If workflow.tenant_id is null/undefined, the workflow belongs to the request tenant (ctx.tenant_id)
      //   and the context should match the request tenant
      const workflowTenantId = workflow.tenant_id != null ? workflow.tenant_id : ctx.tenant_id;
      const tenantMatch = enhancedContext.tenant_id === workflowTenantId;

      // For unit_id:
      // - If workflow.unit_id is set, it must match exactly
      // - If workflow.unit_id is null/undefined, the workflow belongs to the request unit (ctx.unit_id)
      //   and the context should match the request unit (or be undefined if no unit in request)
      const workflowUnitId = workflow.unit_id != null ? workflow.unit_id : ctx.unit_id;
      const unitMatch = !workflowUnitId || enhancedContext.unit_id === workflowUnitId;

      if (eventMatch && entityMatch && tenantMatch && unitMatch) {
        testResult.trigger_evaluation.would_trigger = true;
      } else {
        testResult.trigger_evaluation.would_trigger = false;
        const mismatches: string[] = [];
        if (!eventMatch) {
          mismatches.push(
            `event (expected: ${workflow.trigger.event}, got: ${String(enhancedContext.event || 'undefined')})`
          );
        }
        if (!entityMatch && workflow.trigger.entity) {
          mismatches.push(
            `entity (expected: ${workflow.trigger.entity}, got: ${String(enhancedContext.entity || 'undefined')})`
          );
        }
        if (!tenantMatch) {
          mismatches.push(
            `tenant_id (expected: ${workflowTenantId}, got: ${String(enhancedContext.tenant_id || 'undefined')})`
          );
        }
        if (!unitMatch && workflowUnitId) {
          mismatches.push(
            `unit_id (expected: ${workflowUnitId}, got: ${String(enhancedContext.unit_id || 'undefined')})`
          );
        }
        testResult.trigger_evaluation.reason = `Mismatch: ${mismatches.join(', ')}`;
      }
    } else if (workflow.type === 'schedule') {
      testResult.trigger_evaluation.would_trigger = true;
      testResult.trigger_evaluation.reason = 'Schedule trigger would execute at scheduled time';
    } else if (workflow.type === 'manual') {
      testResult.trigger_evaluation.would_trigger = true;
      testResult.trigger_evaluation.reason = 'Manual trigger can always be executed';
    }

    // Continue to validate actions even if trigger doesn't match (for better UX)
    const shouldContinue = testResult.trigger_evaluation.would_trigger;

    // Evaluate conditions (only if trigger would match)
    if (shouldContinue) {
      if (
        workflow.trigger.type !== 'manual' &&
        'conditions' in workflow.trigger &&
        workflow.trigger.conditions &&
        workflow.trigger.conditions.length > 0
      ) {
        if (!this.workflowEngine) {
          throw new BadRequestException('Workflow engine not available for condition evaluation');
        }

        // Merge data into context for condition evaluation (entity data is in data.*)
        const mergedContext = this.mergeDataIntoContext(enhancedContext);

        // Get logic operator from trigger (default to AND for backward compatibility)
        const logic = workflow.trigger.logic || 'AND';

        const conditionsResult = await this.workflowEngine.evaluateConditionsForSimulation(
          workflow.trigger.conditions,
          mergedContext,
          ctx.tenant_id,
          logic
        );

        const resolvedResults = await Promise.all(
          conditionsResult.results.map(async (r) => {
            const resolvedValue = this.workflowEngine
              ? await this.workflowEngine.resolveConditionValueForSimulation(
                  r.condition.value,
                  mergedContext,
                  ctx.tenant_id
                )
              : undefined;
            return {
              condition: {
                field: r.condition.field,
                operator: r.condition.operator,
                value: r.condition.value,
              },
              result: r.result,
              field_value: r.field_value,
              resolved_value: resolvedValue,
            };
          })
        );

        testResult.conditions_evaluation = {
          met: conditionsResult.met,
          results: resolvedResults,
        };

        testResult.summary.conditions_met = conditionsResult.met;
      } else {
        testResult.summary.conditions_met = true;
      }
    } else {
      // If trigger doesn't match, conditions can't be evaluated
      testResult.summary.conditions_met = false;
    }

    // Simulate actions
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      const actionSimulation: (typeof testResult.actions_simulation)[0] = {
        action_index: i,
        action_type: action.type,
        would_execute: false,
        validation: {
          valid: false,
          errors: [],
          warnings: [],
        },
      };

      try {
        // Validate action based on type
        switch (action.type) {
          case 'update': {
            if (!action.entity) {
              actionSimulation.validation.errors!.push('Entity is required');
            }
            const updateEntityId = action.entity_id || context.entity_id;
            if (!updateEntityId) {
              actionSimulation.validation.errors!.push(
                'Entity ID is required (from action or context)'
              );
            }
            if (!action.data || Object.keys(action.data).length === 0) {
              actionSimulation.validation.warnings!.push('No data provided for update');
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              // Simulate resolved data
              actionSimulation.resolved_data = this.simulateTemplateResolution(
                action.data,
                context
              );
              actionSimulation.simulated_result = {
                entity: action.entity,
                entity_id: updateEntityId,
                would_update: true,
              };
            }
            break;
          }

          case 'create':
            if (!action.entity) {
              actionSimulation.validation.errors!.push('Entity is required');
            }
            if (!action.data || Object.keys(action.data).length === 0) {
              actionSimulation.validation.warnings!.push('No data provided for create');
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.resolved_data = this.simulateTemplateResolution(
                action.data,
                context
              );
              actionSimulation.simulated_result = {
                entity: action.entity,
                would_create: true,
                simulated_id: 'simulated_entity_id',
              };
            }
            break;

          case 'delete': {
            if (!action.entity) {
              actionSimulation.validation.errors!.push('Entity is required');
            }
            const deleteEntityId = action.entity_id || context.entity_id;
            if (!deleteEntityId) {
              actionSimulation.validation.errors!.push(
                'Entity ID is required (from action or context)'
              );
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.simulated_result = {
                entity: action.entity,
                entity_id: deleteEntityId,
                would_delete: true,
              };
            }
            break;
          }

          case 'webhook':
            if (!action.webhook_url) {
              actionSimulation.validation.errors!.push('webhook_url is required');
            } else {
              try {
                new URL(action.webhook_url);
              } catch {
                actionSimulation.validation.errors!.push('Invalid webhook URL format');
              }
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.resolved_data = action.data
                ? this.simulateTemplateResolution(action.data, context)
                : context;
              actionSimulation.simulated_result = {
                method: action.webhook_method || 'POST',
                url: action.webhook_url,
                would_call: true,
                simulated_status: 200,
              };
            }
            break;

          case 'api_call':
            if (!action.endpoint) {
              actionSimulation.validation.errors!.push('endpoint is required');
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.resolved_data = action.data
                ? this.simulateTemplateResolution(action.data, context)
                : undefined;
              actionSimulation.simulated_result = {
                method: action.method || 'POST',
                endpoint: action.endpoint,
                would_call: true,
                simulated_status: 200,
              };
            }
            break;

          case 'mcp_tool':
            if (!action.tool_name) {
              actionSimulation.validation.errors!.push('tool_name is required');
            }
            if (!action.args || Object.keys(action.args).length === 0) {
              actionSimulation.validation.warnings!.push('No args provided for MCP tool');
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.resolved_data = this.simulateTemplateResolution(
                action.args,
                context
              );
              actionSimulation.simulated_result = {
                tool_name: action.tool_name,
                would_call: true,
                simulated_result: {
                  content: [{ type: 'text', text: 'Simulated MCP tool result' }],
                },
              };
            }
            break;

          case 'notify':
            if (!action.to) {
              actionSimulation.validation.errors!.push('to (recipient) is required');
            }
            if (!action.message) {
              actionSimulation.validation.errors!.push('message is required');
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.resolved_data = {
                to: action.to,
                subject: action.subject ? this.simulateTemplateValue(action.subject) : undefined,
                message: this.simulateTemplateValue(action.message),
              };
              actionSimulation.simulated_result = {
                to: action.to,
                would_send: true,
              };
            }
            break;

          case 'chain':
            if (!action.workflow_id) {
              actionSimulation.validation.errors!.push('workflow_id is required');
            }
            actionSimulation.validation.valid = actionSimulation.validation.errors!.length === 0;
            actionSimulation.would_execute = actionSimulation.validation.valid;
            if (actionSimulation.validation.valid) {
              actionSimulation.simulated_result = {
                workflow_id: action.workflow_id,
                would_trigger: true,
                context: action.context || context,
              };
            }
            break;

          default:
            actionSimulation.validation.errors!.push(
              `Unknown action type: ${(action as { type: string }).type}`
            );
            actionSimulation.validation.valid = false;
        }

        if (actionSimulation.validation.valid) {
          testResult.summary.valid_actions++;
        } else {
          testResult.summary.invalid_actions++;
        }
      } catch (error) {
        actionSimulation.validation.valid = false;
        actionSimulation.validation.errors!.push(
          error instanceof Error ? error.message : 'Unknown error during validation'
        );
        testResult.summary.invalid_actions++;
      }

      testResult.actions_simulation.push(actionSimulation);
    }

    // Final summary
    testResult.summary.would_execute =
      testResult.trigger_evaluation.would_trigger &&
      testResult.summary.conditions_met &&
      testResult.summary.valid_actions === testResult.summary.total_actions;

    return testResult;
  }

  /**
   * Enhance test context with entity data from database if entity_id is provided
   */
  private async enhanceTestContextWithEntityData(
    ctx: TenantContext,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const enhanced = { ...context };

    // If entity_id and entity are provided, try to fetch entity data
    const entityId = context.entity_id as string | undefined;
    const entity = context.entity as string | undefined;

    if (entityId && entity) {
      try {
        // Load entity definition to determine scope (tenant vs unit)
        const entityDef = await this.configLoader.getEntity(ctx, entity);
        if (!entityDef) {
          this.logger.warn(`Entity definition not found: ${entity}`);
        } else {
          const entityData = await this.entityRepository.findById(ctx, entity, entityId, entityDef);
          if (entityData) {
            // Add entity data under 'data' key (as it would be in real events)
            const entityObj = entityData as unknown as Record<string, unknown>;
            const cleanData: Record<string, unknown> = {};

            // Copy all fields except MongoDB internal fields and tenant/unit IDs
            for (const [key, value] of Object.entries(entityObj)) {
              if (!key.startsWith('_') && key !== 'tenant_id' && key !== 'unit_id') {
                // Convert Date objects to ISO strings for consistency with event data
                if (value instanceof Date) {
                  cleanData[key] = value.toISOString();
                } else {
                  cleanData[key] = value;
                }
              }
            }

            // Merge into context.data (preserving existing data if any)
            enhanced.data = {
              ...((enhanced.data as Record<string, unknown>) || {}),
              ...cleanData,
            };
          }
        }
      } catch (error) {
        // If entity not found, continue with original context
        // This is fine for simulation - we'll just show that the field is not available
      }
    }

    return enhanced;
  }

  /**
   * Merge data object into context for condition evaluation
   * When entity.updated event is emitted, entity data is in context.data
   * This function merges data.* fields into the root context for easier access
   */
  private mergeDataIntoContext(context: Record<string, unknown>): Record<string, unknown> {
    const merged = { ...context };

    // If context has a 'data' object, merge its properties into the root context
    if (context.data && typeof context.data === 'object' && !Array.isArray(context.data)) {
      const data = context.data as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        // Only merge if key doesn't already exist in context (context takes precedence)
        if (!(key in merged)) {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Simulate template value resolution (simplified version)
   */
  private simulateTemplateResolution(
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // Simple simulation - just mark as resolved
        resolved[key] = `[RESOLVED: ${value}]`;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.simulateTemplateResolution(value as Record<string, unknown>, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Simulate template value resolution for a single string
   */
  private simulateTemplateValue(template: string): string {
    if (typeof template !== 'string') {
      return String(template);
    }

    if (template.includes('{{')) {
      // Simple simulation - just mark as resolved
      return `[RESOLVED: ${template}]`;
    }

    return template;
  }

  /**
   * Validate workflow definition
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.workflow_id || workflow.workflow_id.trim() === '') {
      throw new BadRequestException('workflow_id is required');
    }
    if (!workflow.name) {
      throw new BadRequestException('name is required');
    }
    if (!workflow.type) {
      throw new BadRequestException('type is required');
    }
    if (!workflow.trigger) {
      throw new BadRequestException('trigger is required');
    }
    if (!workflow.actions || workflow.actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }

    // Validate trigger type matches workflow type
    if (workflow.type !== workflow.trigger.type) {
      throw new BadRequestException(
        `Workflow type ${workflow.type} does not match trigger type ${workflow.trigger.type}`
      );
    }

    // Validate schedule trigger has cron expression
    if (workflow.type === 'schedule' && workflow.trigger.type === 'schedule') {
      if (!workflow.trigger.cron) {
        throw new BadRequestException('cron expression is required for schedule trigger');
      }
    }

    // Validate event trigger has event
    if (workflow.type === 'event' && workflow.trigger.type === 'event') {
      if (!workflow.trigger.event) {
        throw new BadRequestException('event is required for event trigger');
      }
    }
  }
}
