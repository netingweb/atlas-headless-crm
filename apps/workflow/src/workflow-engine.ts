import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import type { TenantContext } from '@crm-atlas/core';
import type { WorkflowDefinition, WorkflowCondition, WorkflowOperator } from '@crm-atlas/types';
import {
  WorkflowLogger,
  type ActionExecutionResult,
  type ConditionEvaluationResult,
} from './workflow-logger';
import { ActionRunner, type ActionExecutionContext } from './action-runner';
import { logger } from '@crm-atlas/utils';
import { randomUUID } from 'crypto';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ for blocking commands
});

export class WorkflowEngine {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private configLoader: MongoConfigLoader;
  private workflowLogger: WorkflowLogger;
  private actionRunner: ActionRunner;
  private eventEmitter: {
    on: (event: string, listener: (payload: unknown) => void) => void;
    off: (event: string, listener: (payload: unknown) => void) => void;
  } | null = null;
  private eventListeners: Map<string, Array<() => void>> = new Map();

  constructor(eventEmitter?: {
    on: (event: string, listener: (payload: unknown) => void) => void;
    off: (event: string, listener: (payload: unknown) => void) => void;
  }) {
    this.configLoader = new MongoConfigLoader(getDb());
    this.workflowLogger = new WorkflowLogger();
    this.actionRunner = new ActionRunner();
    this.eventEmitter = eventEmitter || null;
  }

  async start(): Promise<void> {
    logger.info('Starting Workflow Engine...');

    // Load workflows for all tenants
    const tenants = await this.configLoader.getTenants();

    for (const tenant of tenants) {
      const workflows = await this.loadWorkflows(tenant.tenant_id);
      const units = await this.configLoader.getUnits(tenant.tenant_id);

      for (const unit of units) {
        await this.setupWorkflows(tenant.tenant_id, unit.unit_id, workflows);
      }
    }

    logger.info('Workflow Engine started');
  }

  private async loadWorkflows(tenantId: string): Promise<WorkflowDefinition[]> {
    const db = getDb();
    const config = await db.collection('workflows').findOne({ tenant_id: tenantId });
    return (config?.workflows as WorkflowDefinition[]) || [];
  }

  private async setupWorkflows(
    tenantId: string,
    unitId: string,
    workflows: WorkflowDefinition[]
  ): Promise<void> {
    for (const workflow of workflows) {
      // Skip if workflow is not enabled or not active
      if (!workflow.enabled || workflow.status !== 'active') {
        logger.debug(`Skipping workflow ${workflow.workflow_id} (disabled or inactive)`);
        continue;
      }

      // Use unit_id from workflow if provided, otherwise use the unit from context
      const workflowUnitId = workflow.unit_id || unitId;

      const queueName = `workflow_${tenantId}_${workflowUnitId}_${workflow.workflow_id}`;
      const queue = new Queue(queueName, { connection: redis });

      // Create worker
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          await this.executeWorkflow(tenantId, workflowUnitId, workflow, job.data);
        },
        { connection: redis }
      );

      worker.on('completed', (job) => {
        logger.info(`Workflow ${workflow.workflow_id} completed`, { jobId: job.id });
      });

      worker.on('failed', (job, err) => {
        logger.error(`Workflow ${workflow.workflow_id} failed`, err, { jobId: job?.id });
      });

      this.queues.set(queueName, queue);
      this.workers.set(queueName, worker);

      // Setup trigger based on type
      if (workflow.type === 'event' && workflow.trigger.type === 'event') {
        this.setupEventTrigger(tenantId, workflowUnitId, workflow);
      } else if (workflow.type === 'schedule' && workflow.trigger.type === 'schedule') {
        await this.setupScheduleTrigger(tenantId, workflowUnitId, workflow, queue);
      }
      // Manual triggers don't need setup

      logger.info(`Workflow configured: ${workflow.workflow_id}`, {
        type: workflow.type,
        tenant: tenantId,
        unit: workflowUnitId,
      });
    }
  }

  private setupEventTrigger(tenantId: string, unitId: string, workflow: WorkflowDefinition): void {
    if (!this.eventEmitter) {
      logger.warn('EventEmitter not available, event-based workflows will not work');
      return;
    }

    if (workflow.trigger.type !== 'event') {
      return;
    }

    const eventName = workflow.trigger.event;
    const entityFilter = workflow.trigger.entity;

    const listener = (payload: unknown) => {
      const eventPayload = payload as Record<string, unknown>;
      // Check if this event matches the workflow trigger
      if (eventPayload.tenant_id !== tenantId) {
        return;
      }

      if (eventPayload.unit_id !== unitId) {
        return;
      }

      if (entityFilter && eventPayload.entity !== entityFilter) {
        return;
      }

      // Try to queue the workflow execution
      this.tryQueueExecution(tenantId, unitId, workflow, eventPayload, 'event').catch((error) => {
        logger.error(`Failed to queue workflow ${workflow.workflow_id}`, error);
      });
    };

    this.eventEmitter.on(eventName, listener);

    // Store listener for cleanup
    const key = `${tenantId}_${unitId}_${workflow.workflow_id}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key)!.push(() => {
      this.eventEmitter?.off(eventName, listener);
    });

    logger.debug(`Event trigger setup for workflow ${workflow.workflow_id}`, {
      event: eventName,
      entity: entityFilter,
    });
  }

  private async setupScheduleTrigger(
    tenantId: string,
    unitId: string,
    workflow: WorkflowDefinition,
    queue: Queue
  ): Promise<void> {
    if (workflow.trigger.type !== 'schedule') {
      return;
    }

    try {
      // Validate cron expression (basic validation)
      if (!workflow.trigger.cron || workflow.trigger.cron.trim() === '') {
        throw new Error('Cron expression is required');
      }

      // Add repeatable job
      await queue.add(
        'execute',
        {
          tenant_id: tenantId,
          unit_id: unitId,
          trigger_type: 'schedule',
        },
        {
          repeat: {
            pattern: workflow.trigger.cron,
          },
          jobId: `schedule_${tenantId}_${unitId}_${workflow.workflow_id}`,
        }
      );

      logger.debug(`Schedule trigger setup for workflow ${workflow.workflow_id}`, {
        cron: workflow.trigger.cron,
      });
    } catch (error) {
      logger.error(`Invalid cron expression for workflow ${workflow.workflow_id}`, error as Error, {
        cron: workflow.trigger.cron,
      });
      return;
    }
  }

  async triggerWorkflow(
    tenantId: string,
    unitId: string,
    workflowId: string,
    context: Record<string, unknown>,
    actor?: string
  ): Promise<string> {
    const workflow = await this.findWorkflow(tenantId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = randomUUID();
    const queueName = `workflow_${tenantId}_${unitId}_${workflowId}`;
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Workflow ${workflowId} queue not found`);
    }

    // Create execution log
    const logId = await this.workflowLogger.createExecutionLog(
      workflow,
      executionId,
      'manual',
      context,
      actor
    );

    await queue.add('execute', {
      ...context,
      execution_id: executionId,
      log_id: logId,
      trigger_type: 'manual',
      actor,
    });

    logger.info(`Workflow ${workflowId} triggered manually`, { executionId, actor });

    return executionId;
  }

  private async tryQueueExecution(
    tenantId: string,
    unitId: string,
    workflow: WorkflowDefinition,
    context: Record<string, unknown>,
    triggerType: 'event' | 'schedule'
  ): Promise<void> {
    // Check if workflow is enabled
    if (!workflow.enabled || workflow.status !== 'active') {
      return;
    }

    // Evaluate conditions
    if (
      workflow.trigger.type !== 'manual' &&
      'conditions' in workflow.trigger &&
      workflow.trigger.conditions &&
      workflow.trigger.conditions.length > 0
    ) {
      const conditionsMet = await this.evaluateConditions(
        workflow.trigger.conditions,
        context,
        tenantId
      );
      if (!conditionsMet.met) {
        logger.debug(`Workflow ${workflow.workflow_id} conditions not met, skipping`);
        return;
      }
    }

    // Queue execution
    const executionId = randomUUID();
    const queueName = `workflow_${tenantId}_${unitId}_${workflow.workflow_id}`;
    const queue = this.queues.get(queueName);

    if (!queue) {
      logger.warn(`Queue not found for workflow ${workflow.workflow_id}`);
      return;
    }

    // Create execution log
    const logId = await this.workflowLogger.createExecutionLog(
      workflow,
      executionId,
      triggerType,
      context
    );

    await queue.add('execute', {
      ...context,
      execution_id: executionId,
      log_id: logId,
      trigger_type: triggerType,
    });

    logger.info(`Workflow ${workflow.workflow_id} queued for execution`, { executionId });
  }

  private async executeWorkflow(
    tenantId: string,
    unitId: string,
    workflow: WorkflowDefinition,
    jobData: Record<string, unknown>
  ): Promise<void> {
    const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };
    const executionId = (jobData.execution_id as string) || randomUUID();
    const logId = jobData.log_id as string | undefined;

    // Update log status to running
    if (logId) {
      await this.workflowLogger.updateExecutionStatus(logId, 'running');
    }

    try {
      logger.info(`Executing workflow: ${workflow.workflow_id}`, { executionId });

      // Evaluate conditions again (in case context changed)
      let conditionsMet = { met: true, results: [] as ConditionEvaluationResult[] };
      if (
        workflow.trigger.type !== 'manual' &&
        'conditions' in workflow.trigger &&
        workflow.trigger.conditions &&
        workflow.trigger.conditions.length > 0
      ) {
        conditionsMet = await this.evaluateConditions(
          workflow.trigger.conditions,
          jobData,
          tenantId
        );

        // Update log with condition evaluations
        if (logId) {
          await this.workflowLogger.addConditionEvaluations(logId, conditionsMet.results);
        }

        if (!conditionsMet.met) {
          logger.info(`Workflow ${workflow.workflow_id} conditions not met, skipping`);
          if (logId) {
            await this.workflowLogger.updateExecutionStatus(logId, 'skipped');
          }
          return;
        }
      }

      // Execute actions
      const actionResults: ActionExecutionResult[] = [];
      const execContext: ActionExecutionContext = {
        tenant_id: tenantId,
        unit_id: unitId,
        context: jobData,
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      };

      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        const actionStartTime = new Date().toISOString();

        // Log action start
        if (logId) {
          await this.workflowLogger.addActionExecution(logId, {
            action_index: i,
            action_type: action.type,
            status: 'pending',
            started_at: actionStartTime,
          });
        }

        try {
          // Update action status to running
          if (logId) {
            await this.workflowLogger.updateActionExecution(logId, i, 'running');
          }

          let result: unknown;

          // Handle chain action specially
          if (action.type === 'chain') {
            const chainResult = await this.actionRunner.executeAction(ctx, action, execContext);
            const chainedWorkflowId = (chainResult as { workflow_id: string }).workflow_id;
            const chainedContext = (chainResult as { context: Record<string, unknown> }).context;

            // Trigger chained workflow
            await this.triggerWorkflow(
              tenantId,
              unitId,
              chainedWorkflowId,
              chainedContext,
              'system'
            );

            result = { workflow_id: chainedWorkflowId, triggered: true };
          } else {
            result = await this.actionRunner.executeAction(ctx, action, execContext);
          }

          // Update action status to completed
          if (logId) {
            await this.workflowLogger.updateActionExecution(logId, i, 'completed', result);
          }

          actionResults.push({
            action_index: i,
            action_type: action.type,
            status: 'completed',
            started_at: actionStartTime,
            completed_at: new Date().toISOString(),
            result,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          // Update action status to failed
          if (logId) {
            await this.workflowLogger.updateActionExecution(
              logId,
              i,
              'failed',
              undefined,
              errorMessage
            );
          }

          actionResults.push({
            action_index: i,
            action_type: action.type,
            status: 'failed',
            started_at: actionStartTime,
            completed_at: new Date().toISOString(),
            error: errorMessage,
          });

          // Decide whether to continue or fail
          // For now, we fail on any action error
          logger.error(
            `Action ${action.type} failed in workflow ${workflow.workflow_id}`,
            error as Error
          );
          throw error;
        }
      }

      // Execute chained workflows if any
      if (workflow.chained_workflows && workflow.chained_workflows.length > 0) {
        for (const chainedWorkflowId of workflow.chained_workflows) {
          await this.triggerWorkflow(tenantId, unitId, chainedWorkflowId, jobData, 'system');
        }
      }

      // Update log status to completed
      if (logId) {
        await this.workflowLogger.updateExecutionStatus(logId, 'completed');
      }

      logger.info(`Workflow ${workflow.workflow_id} completed successfully`, { executionId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Update log status to failed
      if (logId) {
        const errorStack = error instanceof Error ? error.stack : undefined;
        await this.workflowLogger.updateExecutionStatus(logId, 'failed', errorMessage, errorStack);
      }

      logger.error(`Workflow ${workflow.workflow_id} failed`, error as Error, { executionId });
      throw error;
    }
  }

  private async evaluateConditions(
    conditions: WorkflowCondition[],
    context: Record<string, unknown>,
    tenantId: string
  ): Promise<{ met: boolean; results: ConditionEvaluationResult[] }> {
    if (!conditions || conditions.length === 0) {
      return { met: true, results: [] };
    }

    const results: ConditionEvaluationResult[] = [];
    let allMet = true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(context, condition.field);
      const resolvedValue = await this.resolveConditionValue(condition.value, context, tenantId);
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, resolvedValue);

      results.push({
        condition,
        result: conditionMet,
        field_value: fieldValue,
      });

      if (!conditionMet) {
        allMet = false;
      }
    }

    return { met: allMet, results };
  }

  private evaluateCondition(
    fieldValue: unknown,
    operator: WorkflowOperator,
    expectedValue: unknown
  ): boolean {
    switch (operator) {
      case '==':
        return fieldValue === expectedValue;
      case '!=':
        return fieldValue !== expectedValue;
      case '>':
        return (fieldValue as number) > (expectedValue as number);
      case '<':
        return (fieldValue as number) < (expectedValue as number);
      case '>=':
        return (fieldValue as number) >= (expectedValue as number);
      case '<=':
        return (fieldValue as number) <= (expectedValue as number);
      case 'contains':
        return String(fieldValue).includes(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'startsWith':
        return String(fieldValue).startsWith(String(expectedValue));
      case 'endsWith':
        return String(fieldValue).endsWith(String(expectedValue));
      case 'isEmpty':
        return fieldValue === undefined || fieldValue === null || fieldValue === '';
      case 'isNotEmpty':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      default:
        return false;
    }
  }

  private async resolveConditionValue(
    value: unknown,
    context: Record<string, unknown>,
    tenantId: string
  ): Promise<unknown> {
    if (typeof value !== 'string') {
      return value;
    }

    // Handle dictionary references: {{dictionary.key}}
    if (value.startsWith('{{dictionary.')) {
      const match = value.match(/\{\{dictionary\.([^}]+)\}\}/);
      if (match) {
        const dictKey = match[1];
        return await this.getDictionaryValue(dictKey, tenantId);
      }
    }

    // Handle date expressions: {{today}}, {{today+7d}}
    if (value.includes('{{today')) {
      return this.resolveDateExpression(value);
    }

    // Handle now: {{now}}
    if (value === '{{now}}') {
      return new Date().toISOString();
    }

    // Handle context field access: {{field.path}}
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const path = value.substring(2, value.length - 2).trim();
      return this.getNestedValue(context, path);
    }

    return value;
  }

  private async getDictionaryValue(key: string, tenantId: string): Promise<unknown> {
    try {
      const db = getDb();
      const config = await db.collection('dictionaries').findOne({ tenant_id: tenantId });
      if (config && config.dictionaries) {
        const dicts = config.dictionaries as Record<string, unknown>;
        return this.getNestedValue(dicts, key);
      }
    } catch (error) {
      logger.warn(`Failed to load dictionary value for key ${key}`, { error });
    }
    return undefined;
  }

  private resolveDateExpression(expression: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Match patterns like "{{today+7d}}", "{{today-1d}}", etc.
    const match = expression.match(/\{\{today([+-])(\d+)([dwmy])\}\}/);
    if (match) {
      const operator = match[1];
      const amount = parseInt(match[2], 10);
      const unit = match[3];

      let days = 0;
      switch (unit) {
        case 'd':
          days = amount;
          break;
        case 'w':
          days = amount * 7;
          break;
        case 'm':
          days = amount * 30;
          break;
        case 'y':
          days = amount * 365;
          break;
      }

      if (operator === '+') {
        today.setDate(today.getDate() + days);
      } else {
        today.setDate(today.getDate() - days);
      }
    }

    return today.toISOString().split('T')[0];
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }

  private async findWorkflow(
    tenantId: string,
    workflowId: string
  ): Promise<WorkflowDefinition | null> {
    const workflows = await this.loadWorkflows(tenantId);
    return workflows.find((w) => w.workflow_id === workflowId) || null;
  }

  async stop(): Promise<void> {
    logger.info('Stopping Workflow Engine...');

    // Remove event listeners
    for (const listeners of this.eventListeners.values()) {
      for (const removeListener of listeners) {
        removeListener();
      }
    }
    this.eventListeners.clear();

    // Close workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      logger.debug(`Worker closed: ${name}`);
    }
    this.workers.clear();

    // Close queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.debug(`Queue closed: ${name}`);
    }
    this.queues.clear();

    await redis.quit();
    logger.info('Workflow Engine stopped');
  }

  /**
   * Get workflow logger instance
   */
  getLogger(): WorkflowLogger {
    return this.workflowLogger;
  }
}
