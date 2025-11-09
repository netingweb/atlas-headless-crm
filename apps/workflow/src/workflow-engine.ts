import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import { EntityRepository } from '@crm-atlas/db';
import type { TenantContext } from '@crm-atlas/core';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

export interface WorkflowTrigger {
  type: 'event' | 'scheduled' | 'manual';
  event?: string; // e.g., "entity.created", "entity.updated"
  entity?: string;
  conditions?: Array<{
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in';
    value: unknown;
  }>;
  schedule?: string; // Cron expression
}

export interface WorkflowAction {
  type: 'update' | 'create' | 'notify' | 'assign' | 'webhook';
  entity?: string;
  data?: Record<string, unknown>;
  to?: string; // For notify/assign
  webhook_url?: string; // For webhook
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface WorkflowDefinition {
  workflow_id: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
}

export interface WorkflowExecution {
  workflow_id: string;
  tenant_id: string;
  unit_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  error?: string;
  context: Record<string, unknown>;
}

export class WorkflowEngine {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private configLoader: MongoConfigLoader;
  private repository: EntityRepository;

  constructor() {
    this.configLoader = new MongoConfigLoader(getDb());
    this.repository = new EntityRepository();
  }

  async start(): Promise<void> {
    console.log('🚀 Avvio Workflow Engine...');

    // Load workflows for all tenants
    const tenants = await this.configLoader.getTenants();

    for (const tenant of tenants) {
      const workflows = await this.loadWorkflows(tenant.tenant_id);
      const units = await this.configLoader.getUnits(tenant.tenant_id);

      for (const unit of units) {
        this.setupWorkflows(tenant.tenant_id, unit.unit_id, workflows);
      }
    }

    console.log('✅ Workflow Engine avviato');
  }

  private async loadWorkflows(tenantId: string): Promise<WorkflowDefinition[]> {
    const db = getDb();
    const config = await db.collection('workflows').findOne({ tenant_id: tenantId });
    return (config?.workflows as WorkflowDefinition[]) || [];
  }

  private setupWorkflows(tenantId: string, unitId: string, workflows: WorkflowDefinition[]): void {
    for (const workflow of workflows) {
      const queueName = `workflow:${tenantId}:${unitId}:${workflow.workflow_id}`;
      const queue = new Queue(queueName, { connection: redis });

      // Create worker
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          await this.executeWorkflow(tenantId, unitId, workflow, job.data);
        },
        { connection: redis }
      );

      worker.on('completed', (job) => {
        console.log(`✅ Workflow ${workflow.workflow_id} completato: ${job.id}`);
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Workflow ${workflow.workflow_id} fallito: ${job?.id}`, err);
      });

      this.queues.set(queueName, queue);
      this.workers.set(queueName, worker);

      console.log(`  ✓ Workflow configurato: ${workflow.workflow_id}`);
    }
  }

  async triggerWorkflow(
    tenantId: string,
    unitId: string,
    workflowId: string,
    context: Record<string, unknown>
  ): Promise<void> {
    const queueName = `workflow:${tenantId}:${unitId}:${workflowId}`;
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Workflow ${workflowId} non trovato`);
    }

    await queue.add('execute', context);
    console.log(`📤 Workflow ${workflowId} triggerato`);
  }

  private async executeWorkflow(
    tenantId: string,
    unitId: string,
    workflow: WorkflowDefinition,
    context: Record<string, unknown>
  ): Promise<void> {
    const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };

    console.log(`🔄 Esecuzione workflow: ${workflow.workflow_id}`);

    // Check conditions if any
    if (workflow.trigger.conditions && workflow.trigger.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(workflow.trigger.conditions, context);
      if (!conditionsMet) {
        console.log(`  ⏭️  Condizioni non soddisfatte, workflow saltato`);
        return;
      }
    }

    // Execute actions
    for (const action of workflow.actions) {
      try {
        await this.executeAction(ctx, action, context);
      } catch (error) {
        console.error(`  ❌ Errore esecuzione action ${action.type}:`, error);
        throw error;
      }
    }

    console.log(`  ✅ Workflow ${workflow.workflow_id} completato`);
  }

  private evaluateConditions(
    conditions: WorkflowTrigger['conditions'],
    context: Record<string, unknown>
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(context, condition.field);
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);

      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(
    fieldValue: unknown,
    operator: WorkflowTrigger['conditions'][0]['operator'],
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
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }

  private async executeAction(
    ctx: TenantContext,
    action: WorkflowAction,
    context: Record<string, unknown>
  ): Promise<void> {
    switch (action.type) {
      case 'update': {
        if (!action.entity || !context.entity_id) {
          throw new Error('Entity e entity_id richiesti per action update');
        }
        await this.repository.update(
          ctx,
          action.entity,
          String(context.entity_id),
          action.data || {}
        );
        console.log(`    ✓ Updated ${action.entity}/${String(context.entity_id)}`);
        break;
      }

      case 'create': {
        if (!action.entity) {
          throw new Error('Entity richiesta per action create');
        }
        const created = await this.repository.create(ctx, action.entity, action.data || {});
        console.log(`    ✓ Created ${action.entity}/${String((created as { _id: string })._id)}`);
        break;
      }

      case 'assign': {
        if (!action.entity || !context.entity_id || !action.to) {
          throw new Error('Entity, entity_id e to richiesti per action assign');
        }
        await this.repository.update(ctx, action.entity, String(context.entity_id), {
          assigned_to: action.to,
        });
        console.log(`    ✓ Assigned ${action.entity}/${String(context.entity_id)} to ${action.to}`);
        break;
      }

      case 'notify': {
        // Placeholder for notification (email/webhook)
        console.log(`    📧 Notify ${action.to}: ${JSON.stringify(action.data)}`);
        break;
      }

      case 'webhook': {
        if (!action.webhook_url) {
          throw new Error('webhook_url richiesta per action webhook');
        }
        const method = action.webhook_method || 'POST';
        await fetch(action.webhook_url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...context, ...action.data }),
        });
        console.log(`    ✓ Webhook chiamato: ${action.webhook_url}`);
        break;
      }

      default:
        throw new Error(`Action type sconosciuto: ${(action as { type: string }).type}`);
    }
  }

  async stop(): Promise<void> {
    console.log('🛑 Arresto Workflow Engine...');

    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      console.log(`  ✓ Worker chiuso: ${name}`);
    }

    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      console.log(`  ✓ Queue chiusa: ${name}`);
    }

    await redis.quit();
    console.log('✅ Workflow Engine arrestato');
  }
}
