import { z } from 'zod';

// Workflow condition operators
export const WorkflowOperatorSchema = z.enum([
  '==',
  '!=',
  '>',
  '<',
  '>=',
  '<=',
  'contains',
  'in',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty',
]);

export type WorkflowOperator = z.infer<typeof WorkflowOperatorSchema>;

// Workflow condition
export const WorkflowConditionSchema = z.object({
  field: z.string(),
  operator: WorkflowOperatorSchema,
  value: z.unknown(),
});

export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;

// Logic operator for combining conditions
export const ConditionLogicSchema = z.enum(['AND', 'OR']);

export type ConditionLogic = z.infer<typeof ConditionLogicSchema>;

// Event trigger
export const EventTriggerSchema = z.object({
  type: z.literal('event'),
  event: z.enum(['entity.created', 'entity.updated', 'entity.deleted']),
  entity: z.string().optional(),
  conditions: z.array(WorkflowConditionSchema).optional(),
  logic: ConditionLogicSchema.optional(), // How to combine conditions: AND (all must be true) or OR (at least one must be true). Defaults to AND if not specified.
});

export type EventTrigger = z.infer<typeof EventTriggerSchema>;

// Schedule trigger
export const ScheduleTriggerSchema = z.object({
  type: z.literal('schedule'),
  cron: z.string(), // Cron expression
  entity: z.string().optional(),
  conditions: z.array(WorkflowConditionSchema).optional(),
  logic: ConditionLogicSchema.optional(), // How to combine conditions: AND (all must be true) or OR (at least one must be true). Defaults to AND if not specified.
});

export type ScheduleTrigger = z.infer<typeof ScheduleTriggerSchema>;

// Manual trigger
export const ManualTriggerSchema = z.object({
  type: z.literal('manual'),
});

export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;

// Workflow trigger union
export const WorkflowTriggerSchema = z.discriminatedUnion('type', [
  EventTriggerSchema,
  ScheduleTriggerSchema,
  ManualTriggerSchema,
]);

export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;

// Action types
export const ActionTypeSchema = z.enum([
  'update',
  'create',
  'delete',
  'webhook',
  'api_call',
  'mcp_tool',
  'notify',
  'chain',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

// Base action schema
const BaseActionSchema = z.object({
  type: ActionTypeSchema,
});

// Update action
export const UpdateActionSchema = BaseActionSchema.extend({
  type: z.literal('update'),
  entity: z.string(),
  entity_id: z.string().optional(), // If not provided, uses context.entity_id
  data: z.record(z.unknown()),
});

// Create action
export const CreateActionSchema = BaseActionSchema.extend({
  type: z.literal('create'),
  entity: z.string(),
  data: z.record(z.unknown()),
});

// Delete action
export const DeleteActionSchema = BaseActionSchema.extend({
  type: z.literal('delete'),
  entity: z.string(),
  entity_id: z.string().optional(), // If not provided, uses context.entity_id
});

// Webhook action
export const WebhookActionSchema = BaseActionSchema.extend({
  type: z.literal('webhook'),
  webhook_url: z.string().url(),
  webhook_method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
  data: z.record(z.unknown()).optional(),
  timeout: z.number().optional(), // Timeout in milliseconds
});

// API call action
export const ApiCallActionSchema = BaseActionSchema.extend({
  type: z.literal('api_call'),
  endpoint: z.string(), // Relative to API base URL
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional(),
  data: z.record(z.unknown()).optional(),
  timeout: z.number().optional(),
});

// MCP tool action
export const McpToolActionSchema = BaseActionSchema.extend({
  type: z.literal('mcp_tool'),
  tool_name: z.string(),
  args: z.record(z.unknown()),
  tenant_id: z.string().optional(), // If not provided, uses context.tenant_id
  unit_id: z.string().optional(), // If not provided, uses context.unit_id
});

// Notify action
export const NotifyActionSchema = BaseActionSchema.extend({
  type: z.literal('notify'),
  to: z.string(), // User ID or email
  subject: z.string().optional(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
});

// Chain action
export const ChainActionSchema = BaseActionSchema.extend({
  type: z.literal('chain'),
  workflow_id: z.string(),
  context: z.record(z.unknown()).optional(), // Additional context to pass
});

// Workflow action union
export const WorkflowActionSchema: z.ZodType<WorkflowAction> = z.discriminatedUnion('type', [
  UpdateActionSchema,
  CreateActionSchema,
  DeleteActionSchema,
  WebhookActionSchema,
  ApiCallActionSchema,
  McpToolActionSchema,
  NotifyActionSchema,
  ChainActionSchema,
]) as z.ZodType<WorkflowAction>;

export type WorkflowAction =
  | z.infer<typeof UpdateActionSchema>
  | z.infer<typeof CreateActionSchema>
  | z.infer<typeof DeleteActionSchema>
  | z.infer<typeof WebhookActionSchema>
  | z.infer<typeof ApiCallActionSchema>
  | z.infer<typeof McpToolActionSchema>
  | z.infer<typeof NotifyActionSchema>
  | z.infer<typeof ChainActionSchema>;

// Workflow status
export const WorkflowStatusSchema = z.enum(['active', 'inactive', 'draft']);

export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

// Workflow metadata
export const WorkflowMetadataSchema = z.object({
  created_by: z.string().optional(),
  updated_by: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().default(1),
});

export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;

// Workflow definition
export const WorkflowDefinitionSchema = z.object({
  workflow_id: z.string(),
  tenant_id: z.string(),
  unit_id: z.string().optional(),
  name: z.string(),
  type: z.enum(['event', 'schedule', 'manual']),
  enabled: z.boolean().default(true),
  status: WorkflowStatusSchema.default('active'),
  trigger: WorkflowTriggerSchema,
  actions: z.array(WorkflowActionSchema),
  chained_workflows: z.array(z.string()).optional(), // Workflow IDs to execute after this one
  metadata: WorkflowMetadataSchema.optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// Workflows config (for JSON files)
export const WorkflowsConfigSchema = z.object({
  tenant_id: z.string(),
  workflows: z.array(WorkflowDefinitionSchema),
});

export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;

// Workflow execution log entry
export const WorkflowExecutionLogSchema = z.object({
  log_id: z.string(),
  workflow_id: z.string(),
  tenant_id: z.string(),
  unit_id: z.string().optional(),
  execution_id: z.string(), // Unique ID for this execution
  trigger_type: z.enum(['event', 'schedule', 'manual']),
  trigger_event: z.string().optional(), // Event name (e.g., "entity.updated")
  trigger_entity: z.string().optional(), // Entity name that triggered
  trigger_entity_id: z.string().optional(), // Entity ID that triggered
  actor: z.string().optional(), // User ID who triggered (for manual) or system
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  duration_ms: z.number().optional(),
  context: z.record(z.unknown()).optional(), // Context data at trigger time
  actions_executed: z.array(
    z.object({
      action_index: z.number(),
      action_type: ActionTypeSchema,
      status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
      started_at: z.string().datetime(),
      completed_at: z.string().datetime().optional(),
      duration_ms: z.number().optional(),
      result: z.unknown().optional(),
      error: z.string().optional(),
    })
  ),
  error: z.string().optional(),
  error_stack: z.string().optional(),
  conditions_evaluated: z
    .array(
      z.object({
        condition: WorkflowConditionSchema,
        result: z.boolean(),
        field_value: z.unknown().optional(),
      })
    )
    .optional(),
  chained_workflows: z.array(z.string()).optional(), // Workflow IDs that were chained
});

export type WorkflowExecutionLog = z.infer<typeof WorkflowExecutionLogSchema>;
