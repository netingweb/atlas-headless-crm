import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getDb } from '@crm-atlas/db';
import type { TenantContext } from '@crm-atlas/core';
import type { WorkflowDefinition, WorkflowExecutionLog } from '@crm-atlas/types';
// Note: WorkflowEngine and WorkflowLogger are imported from the workflow app
// These will be provided by the WorkflowsModule
import type { WorkflowEngine } from '../../../workflow/src/workflow-engine';
import { WorkflowLogger } from '../../../workflow/src/workflow-logger';

@Injectable()
export class WorkflowsService {
  private readonly db = getDb();
  private readonly workflowLogger = new WorkflowLogger();
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
      return [];
    }
    const workflows = (config.workflows as WorkflowDefinition[]) || [];
    // Filter by unit_id if provided
    if (ctx.unit_id) {
      return workflows.filter((w) => !w.unit_id || w.unit_id === ctx.unit_id);
    }
    return workflows;
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(ctx: TenantContext, workflowId: string): Promise<WorkflowDefinition> {
    const workflows = await this.getWorkflows(ctx);
    const workflow = workflows.find((w) => w.workflow_id === workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
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
      // Generate a unique ID based on name and timestamp
      const nameSlug = (workflow.name || 'workflow')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const timestamp = Date.now().toString(36);
      workflowId = `${nameSlug}_${timestamp}`;
    }

    // Get existing workflows to check for duplicates
    const config = await this.db.collection('workflows').findOne({ tenant_id: ctx.tenant_id });
    const workflows = (config?.workflows as WorkflowDefinition[]) || [];

    // Check if workflow ID already exists
    if (workflows.some((w) => w.workflow_id === workflowId)) {
      // If duplicate, append a random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      workflowId = `${workflowId}_${randomSuffix}`;
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
    const updatedWorkflow: WorkflowDefinition = {
      ...workflows[index],
      ...updates,
      updated_at: new Date().toISOString(),
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
  ): Promise<{ execution_id: string }> {
    if (!this.workflowEngine) {
      throw new BadRequestException('Workflow engine not available');
    }

    const executionId = await this.workflowEngine.triggerWorkflow(
      ctx.tenant_id,
      ctx.unit_id,
      workflowId,
      context,
      actor
    );

    return { execution_id: executionId };
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
