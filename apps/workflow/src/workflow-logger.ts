import { randomUUID } from 'crypto';
import { getDb } from '@crm-atlas/db';
import type { WorkflowExecutionLog, WorkflowDefinition, WorkflowCondition } from '@crm-atlas/types';

export interface ActionExecutionResult {
  action_index: number;
  action_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result?: unknown;
  error?: string;
}

export interface ConditionEvaluationResult {
  condition: WorkflowCondition;
  result: boolean;
  field_value?: unknown;
}

export class WorkflowLogger {
  private readonly db = getDb();
  private readonly collection = 'workflow_execution_logs';

  /**
   * Create a new execution log entry
   */
  async createExecutionLog(
    workflow: WorkflowDefinition,
    executionId: string,
    triggerType: 'event' | 'schedule' | 'manual',
    context: Record<string, unknown>,
    actor?: string
  ): Promise<string> {
    const logId = randomUUID();
    const now = new Date().toISOString();

    // Ensure workflow_id is present and valid
    if (!workflow.workflow_id) {
      throw new Error(
        `Workflow missing workflow_id: ${JSON.stringify({ name: workflow.name, tenant_id: workflow.tenant_id, unit_id: workflow.unit_id })}`
      );
    }

    const log: WorkflowExecutionLog = {
      log_id: logId,
      workflow_id: workflow.workflow_id,
      tenant_id: workflow.tenant_id,
      unit_id: workflow.unit_id,
      execution_id: executionId,
      trigger_type: triggerType,
      trigger_event: context.event as string | undefined,
      trigger_entity: context.entity as string | undefined,
      trigger_entity_id: context.entity_id as string | undefined,
      actor: actor || 'system',
      status: 'pending',
      started_at: now,
      context: { ...context },
      actions_executed: [],
      chained_workflows: workflow.chained_workflows,
    };

    // Log the workflow_id being saved for debugging
    const { logger } = await import('@crm-atlas/utils');
    logger.debug(`Creating execution log with workflow_id: ${workflow.workflow_id}`, {
      workflow_name: workflow.name,
      tenant_id: workflow.tenant_id,
      unit_id: workflow.unit_id,
      trigger_type: triggerType,
    });

    await this.db.collection(this.collection).insertOne(log);

    return logId;
  }

  /**
   * Update execution log status
   */
  async updateExecutionStatus(
    logId: string,
    status: 'running' | 'completed' | 'failed' | 'skipped',
    error?: string,
    errorStack?: string
  ): Promise<void> {
    const update: Partial<WorkflowExecutionLog> = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (status === 'completed' || status === 'failed') {
      const log = await this.db.collection(this.collection).findOne({ log_id: logId });
      if (log && log.started_at) {
        const startedAt = new Date(log.started_at);
        const completedAt = new Date(update.completed_at!);
        update.duration_ms = completedAt.getTime() - startedAt.getTime();
      }
    }

    if (error) {
      update.error = error;
    }
    if (errorStack) {
      update.error_stack = errorStack;
    }

    await this.db.collection(this.collection).updateOne({ log_id: logId }, { $set: update });
  }

  /**
   * Add action execution result
   */
  async addActionExecution(logId: string, actionResult: ActionExecutionResult): Promise<void> {
    await this.db
      .collection(this.collection)
      .updateOne({ log_id: logId }, { $push: { actions_executed: actionResult } as any });
  }

  /**
   * Update action execution status
   */
  async updateActionExecution(
    logId: string,
    actionIndex: number,
    status: 'running' | 'completed' | 'failed' | 'skipped',
    result?: unknown,
    error?: string
  ): Promise<void> {
    const log = await this.db.collection(this.collection).findOne({ log_id: logId });
    if (!log) {
      throw new Error(`Execution log ${logId} not found`);
    }

    const actions = (log.actions_executed as ActionExecutionResult[]) || [];
    const action = actions[actionIndex];

    if (!action) {
      throw new Error(`Action at index ${actionIndex} not found`);
    }

    const now = new Date().toISOString();
    const update: Partial<ActionExecutionResult> = {
      status,
      completed_at: now,
    };

    if (status === 'completed' || status === 'failed') {
      const startedAt = new Date(action.started_at);
      const completedAt = new Date(now);
      update.duration_ms = completedAt.getTime() - startedAt.getTime();
    }

    if (result !== undefined) {
      update.result = result;
    }
    if (error) {
      update.error = error;
    }

    await this.db
      .collection(this.collection)
      .updateOne(
        { log_id: logId, 'actions_executed.action_index': actionIndex },
        { $set: { 'actions_executed.$': { ...action, ...update } } as any }
      );
  }

  /**
   * Add condition evaluation results
   */
  async addConditionEvaluations(
    logId: string,
    conditions: ConditionEvaluationResult[]
  ): Promise<void> {
    await this.db
      .collection(this.collection)
      .updateOne({ log_id: logId }, { $set: { conditions_evaluated: conditions } as any });
  }

  /**
   * Get execution log by ID
   */
  async getExecutionLog(logId: string): Promise<WorkflowExecutionLog | null> {
    const log = await this.db.collection(this.collection).findOne({ log_id: logId });
    return log as WorkflowExecutionLog | null;
  }

  /**
   * Get execution logs for a workflow
   */
  async getWorkflowExecutions(
    workflowId: string,
    tenantId: string,
    limit = 100,
    offset = 0
  ): Promise<WorkflowExecutionLog[]> {
    const logs = await this.db
      .collection(this.collection)
      .find({
        workflow_id: workflowId,
        tenant_id: tenantId,
      })
      .sort({ started_at: -1 })
      .limit(limit)
      .skip(offset)
      .toArray();

    return logs as unknown as WorkflowExecutionLog[];
  }

  /**
   * Get execution logs for a tenant
   */
  async getTenantExecutions(
    tenantId: string,
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
    const query: Record<string, unknown> = {
      tenant_id: tenantId,
    };

    if (filters?.workflowId) {
      query.workflow_id = filters.workflowId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.triggerType) {
      query.trigger_type = filters.triggerType;
    }

    if (filters?.startDate || filters?.endDate) {
      const dateQuery: Record<string, unknown> = {};
      if (filters.startDate) {
        dateQuery.$gte = filters.startDate;
      }
      if (filters.endDate) {
        dateQuery.$lte = filters.endDate;
      }
      if (Object.keys(dateQuery).length > 0) {
        query.started_at = dateQuery;
      }
    }

    const logs = await this.db
      .collection(this.collection)
      .find(query)
      .sort({ started_at: -1 })
      .limit(limit)
      .skip(offset)
      .toArray();

    return logs as unknown as WorkflowExecutionLog[];
  }

  /**
   * Get execution statistics for a workflow
   */
  async getWorkflowStats(
    workflowId: string,
    tenantId: string
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    average_duration_ms: number;
    last_execution: string | null;
  }> {
    const logs = await this.db
      .collection(this.collection)
      .find({
        workflow_id: workflowId,
        tenant_id: tenantId,
      })
      .toArray();

    const typedLogs = logs as unknown as WorkflowExecutionLog[];
    const total = typedLogs.length;
    const completed = typedLogs.filter((l) => l.status === 'completed').length;
    const failed = typedLogs.filter((l) => l.status === 'failed').length;
    const skipped = typedLogs.filter((l) => l.status === 'skipped').length;

    const completedLogs = typedLogs.filter(
      (l) => l.status === 'completed' && l.duration_ms !== undefined
    );
    const average_duration_ms =
      completedLogs.length > 0
        ? completedLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / completedLogs.length
        : 0;

    const sortedLogs = typedLogs.sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    const last_execution = sortedLogs.length > 0 ? sortedLogs[0].started_at : null;

    return {
      total,
      completed,
      failed,
      skipped,
      average_duration_ms: Math.round(average_duration_ms),
      last_execution,
    };
  }

  /**
   * Delete all execution logs for a tenant
   */
  async deleteAllTenantExecutions(tenantId: string): Promise<number> {
    const result = await this.db.collection(this.collection).deleteMany({
      tenant_id: tenantId,
    });
    return result.deletedCount;
  }
}
