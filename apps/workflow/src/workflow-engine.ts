import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb, EntityRepository } from '@crm-atlas/db';
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
  private entityRepository: EntityRepository;
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
    this.entityRepository = new EntityRepository();
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

      await this.ensureWorkflowQueue(tenantId, unitId, workflow);
    }
  }

  /**
   * Ensure workflow queue and worker exist, create them if they don't
   */
  private async ensureWorkflowQueue(
    tenantId: string,
    unitId: string,
    workflow: WorkflowDefinition
  ): Promise<void> {
    // Use unit_id from workflow if provided, otherwise use the unit from context
    const workflowUnitId = workflow.unit_id || unitId;
    const queueName = `workflow_${tenantId}_${workflowUnitId}_${workflow.workflow_id}`;

    // Check if queue already exists
    if (this.queues.has(queueName)) {
      logger.debug(`Queue already exists for workflow ${workflow.workflow_id}`);
      return;
    }

    try {
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

      // Setup trigger based on type (only if workflow is enabled and active)
      if (workflow.enabled && workflow.status === 'active') {
        if (workflow.type === 'event' && workflow.trigger.type === 'event') {
          this.setupEventTrigger(tenantId, workflowUnitId, workflow);
        } else if (workflow.type === 'schedule' && workflow.trigger.type === 'schedule') {
          await this.setupScheduleTrigger(tenantId, workflowUnitId, workflow, queue);
        }
        // Manual triggers don't need setup
      }

      logger.info(`Workflow queue created: ${workflow.workflow_id}`, {
        type: workflow.type,
        tenant: tenantId,
        unit: workflowUnitId,
        queueName,
      });
    } catch (error) {
      logger.error(`Error creating queue for workflow ${workflow.workflow_id}`, error as Error, {
        queueName,
      });
      throw error;
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

    // Ensure workflow_id matches the requested workflowId
    if (workflow.workflow_id !== workflowId) {
      logger.warn(
        `Workflow ID mismatch: requested ${workflowId}, found ${workflow.workflow_id}. Using requested ID.`
      );
      workflow.workflow_id = workflowId;
    }

    // Use unit_id from workflow if provided, otherwise use the unit from context
    // This ensures consistency with how queues are named in ensureWorkflowQueue
    const workflowUnitId = workflow.unit_id || unitId;

    const executionId = randomUUID();
    const queueName = `workflow_${tenantId}_${workflowUnitId}_${workflowId}`;
    let queue = this.queues.get(queueName);

    // If queue doesn't exist, create it on-the-fly
    if (!queue) {
      logger.warn(`Queue not found for workflow ${workflowId}, creating it on-the-fly`);
      try {
        await this.ensureWorkflowQueue(tenantId, workflowUnitId, workflow);
        queue = this.queues.get(queueName);

        if (!queue) {
          throw new Error(
            `Failed to create queue for workflow ${workflowId} - queue not found after creation`
          );
        }
      } catch (error) {
        logger.error(`Error creating queue for workflow ${workflowId}`, error as Error);
        throw new Error(
          `Failed to create queue for workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Create execution log
    const logId = await this.workflowLogger.createExecutionLog(
      workflow,
      executionId,
      'manual',
      context,
      actor
    );

    try {
      await queue.add('execute', {
        ...context,
        execution_id: executionId,
        log_id: logId,
        trigger_type: 'manual',
        actor,
      });

      logger.info(`Workflow ${workflow.workflow_id} queued for execution`, {
        executionId,
        logId,
        actor,
      });
      return executionId;
    } catch (error) {
      logger.error(`Error queueing workflow ${workflowId}`, error as Error, { executionId });
      throw new Error(
        `Failed to queue workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
      const logic = workflow.trigger.logic || 'AND';
      const conditionsMet = await this.evaluateConditions(
        workflow.trigger.conditions,
        context,
        tenantId,
        logic
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

      // Enhance context with entity data if entity_id is provided (same as in test)
      const enhancedContext = await this.enhanceContextWithEntityData(
        { tenant_id: tenantId, unit_id: unitId },
        jobData
      );

      // Merge data into context for condition evaluation (entity data is in data.*)
      const mergedContext = this.mergeDataIntoContext(enhancedContext);

      // Evaluate conditions again (in case context changed)
      let conditionsMet = { met: true, results: [] as ConditionEvaluationResult[] };
      if (
        workflow.trigger.type !== 'manual' &&
        'conditions' in workflow.trigger &&
        workflow.trigger.conditions &&
        workflow.trigger.conditions.length > 0
      ) {
        const logic = workflow.trigger.logic || 'AND';
        conditionsMet = await this.evaluateConditions(
          workflow.trigger.conditions,
          mergedContext,
          tenantId,
          logic
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
        context: enhancedContext,
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
    tenantId: string,
    logic: 'AND' | 'OR' = 'AND'
  ): Promise<{ met: boolean; results: ConditionEvaluationResult[] }> {
    if (!conditions || conditions.length === 0) {
      return { met: true, results: [] };
    }

    // Merge data into context for condition evaluation (entity data is in data.*)
    const enhancedContext = this.mergeDataIntoContext(context);

    const results: ConditionEvaluationResult[] = [];
    let allMet = true;
    let atLeastOneMet = false;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(enhancedContext, condition.field);
      const resolvedValue = await this.resolveConditionValue(
        condition.value,
        enhancedContext,
        tenantId
      );
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, resolvedValue);

      results.push({
        condition,
        result: conditionMet,
        field_value: fieldValue,
      });

      if (conditionMet) {
        atLeastOneMet = true;
      } else {
        allMet = false;
      }
    }

    // Apply logic: AND requires all conditions to be true, OR requires at least one
    const finalResult = logic === 'OR' ? atLeastOneMet : allMet;

    return { met: finalResult, results };
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
      case '<':
      case '>=':
      case '<=': {
        // Try to parse as dates first (for date comparisons)
        const fieldDate = this.parseDate(fieldValue);
        const expectedDate = this.parseDate(expectedValue);

        if (fieldDate && expectedDate) {
          // Both are dates, compare as dates
          switch (operator) {
            case '>':
              return fieldDate > expectedDate;
            case '<':
              return fieldDate < expectedDate;
            case '>=':
              return fieldDate >= expectedDate;
            case '<=':
              return fieldDate <= expectedDate;
          }
        }

        // Fallback to number comparison
        const fieldNum = Number(fieldValue);
        const expectedNum = Number(expectedValue);

        if (!isNaN(fieldNum) && !isNaN(expectedNum)) {
          switch (operator) {
            case '>':
              return fieldNum > expectedNum;
            case '<':
              return fieldNum < expectedNum;
            case '>=':
              return fieldNum >= expectedNum;
            case '<=':
              return fieldNum <= expectedNum;
          }
        }

        // If neither date nor number comparison works, return false
        return false;
      }
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
    const found = workflows.find((w) => w.workflow_id === workflowId);

    if (!found) {
      logger.warn(
        `Workflow ${workflowId} not found in tenant ${tenantId}. Available workflow IDs: ${workflows.map((w) => w.workflow_id).join(', ')}`
      );
      return null;
    }

    // Ensure the found workflow has the correct workflow_id
    if (found.workflow_id !== workflowId) {
      logger.error(
        `Workflow ID mismatch in findWorkflow: requested ${workflowId}, found ${found.workflow_id}`
      );
      found.workflow_id = workflowId;
    }

    return found;
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

  /**
   * Evaluate conditions for simulation (public method)
   */
  async evaluateConditionsForSimulation(
    conditions: WorkflowCondition[],
    context: Record<string, unknown>,
    tenantId: string,
    logic: 'AND' | 'OR' = 'AND'
  ): Promise<{ met: boolean; results: ConditionEvaluationResult[] }> {
    return this.evaluateConditions(conditions, context, tenantId, logic);
  }

  /**
   * Resolve condition value for simulation (public method)
   */
  async resolveConditionValueForSimulation(
    value: unknown,
    context: Record<string, unknown>,
    tenantId: string
  ): Promise<unknown> {
    return this.resolveConditionValue(value, context, tenantId);
  }

  /**
   * Get nested value helper (public method)
   */
  getNestedValueForSimulation(obj: Record<string, unknown>, path: string): unknown {
    return this.getNestedValue(obj, path);
  }

  /**
   * Parse a value as a date if possible
   * Returns Date object if parseable, null otherwise
   */
  private parseDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      // Try ISO date string (e.g., "2025-11-09T14:23:56.767Z" or "2025-11-09")
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    if (typeof value === 'number') {
      // Try timestamp
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * Enhance context with entity data from database if entity_id is provided
   */
  private async enhanceContextWithEntityData(
    ctx: TenantContext,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const enhanced = { ...context };

    // If entity_id and entity are provided, try to fetch entity data
    const entityId = context.entity_id as string | undefined;
    const entity = context.entity as string | undefined;

    if (entityId && entity) {
      try {
        const entityData = await this.entityRepository.findById(ctx, entity, entityId);
        if (entityData) {
          // Add entity data under 'data' key (as it would be in real events)
          const entityObj = entityData as unknown as Record<string, unknown>;
          const cleanData: Record<string, unknown> = {};

          // Get all enumerable keys
          const enumerableKeys = Object.keys(entityObj);

          // Also check for common fields that might not be enumerable
          // Use 'in' operator to check if field exists, regardless of enumerability
          const allPossibleKeys = new Set<string>(enumerableKeys);
          const commonFields = [
            'created_at',
            'updated_at',
            'status',
            'name',
            'email',
            'phone',
            'source',
            'role',
            'company_id',
          ];
          for (const key of commonFields) {
            if (key in entityObj) {
              allPossibleKeys.add(key);
            }
          }

          logger.debug(`Entity data retrieved for ${entity}/${entityId}`, {
            enumerableKeys,
            hasCreatedAtInEntity: 'created_at' in entityObj,
            createdAtValueInEntity: entityObj.created_at,
            createdAtTypeInEntity: typeof entityObj.created_at,
            createdAtInstanceOfDate: entityObj.created_at instanceof Date,
            allPossibleKeys: Array.from(allPossibleKeys),
          });

          // Copy all fields except MongoDB internal fields and tenant/unit IDs
          for (const key of allPossibleKeys) {
            if (!key.startsWith('_') && key !== 'tenant_id' && key !== 'unit_id') {
              const value = entityObj[key];
              // Convert Date objects to ISO strings for consistency with event data
              if (value instanceof Date) {
                cleanData[key] = value.toISOString();
              } else if (value !== undefined && value !== null) {
                cleanData[key] = value;
              }
            }
          }

          // CRITICAL: Explicitly check and add created_at and updated_at if they exist
          // This is a fallback in case they weren't caught by the loop above
          if (
            'created_at' in entityObj &&
            entityObj.created_at !== undefined &&
            entityObj.created_at !== null
          ) {
            const createdAt = entityObj.created_at;
            cleanData.created_at =
              createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
            logger.debug(`Explicitly added created_at to cleanData`, {
              createdAt,
              createdAtType: typeof createdAt,
              createdAtInstanceOfDate: createdAt instanceof Date,
              cleanDataCreatedAt: cleanData.created_at,
            });
          }
          if (
            'updated_at' in entityObj &&
            entityObj.updated_at !== undefined &&
            entityObj.updated_at !== null
          ) {
            const updatedAt = entityObj.updated_at;
            cleanData.updated_at =
              updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt);
          }

          logger.debug(`Enhanced context with entity data for ${entity}/${entityId}`, {
            fieldsAdded: Object.keys(cleanData),
            hasCreatedAt: 'created_at' in cleanData,
            createdAtValue: cleanData.created_at,
            allEntityFields: enumerableKeys,
            entityObjHasCreatedAt: 'created_at' in entityObj,
            entityObjCreatedAtValue: entityObj.created_at,
            entityObjCreatedAtType: typeof entityObj.created_at,
          });

          // Merge into context.data (preserving existing data if any, but entity data takes precedence)
          // Use the same approach as in test workflow
          const existingData = (enhanced.data as Record<string, unknown>) || {};
          enhanced.data = {
            ...existingData,
            ...cleanData, // Entity data takes precedence
          };

          const mergedData = enhanced.data as Record<string, unknown>;

          logger.debug(`Merged context.data`, {
            finalDataKeys: Object.keys(mergedData),
            hasCreatedAtInFinal: 'created_at' in mergedData,
            createdAtValue: mergedData.created_at,
            cleanDataKeys: Object.keys(cleanData),
            existingDataKeys: Object.keys(existingData),
            cleanDataHasCreatedAt: 'created_at' in cleanData,
            existingDataHasCreatedAt: 'created_at' in existingData,
          });

          // Also merge directly into context root for easier access (like mergeDataIntoContext does)
          // This ensures created_at is accessible both as context.created_at and context.data.created_at
          for (const [key, value] of Object.entries(cleanData)) {
            if (!(key in enhanced)) {
              enhanced[key] = value;
            }
          }

          logger.debug(`After direct merge into context root`, {
            hasCreatedAtInRoot: 'created_at' in enhanced,
            createdAtValueInRoot: enhanced.created_at,
          });
        } else {
          logger.warn(`Entity ${entity}/${entityId} not found in database`);
        }
      } catch (error) {
        // If entity not found, continue with original context
        logger.warn(`Entity ${entity}/${entityId} not found, continuing with original context`, {
          error,
        });
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
}
