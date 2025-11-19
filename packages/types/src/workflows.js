"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowExecutionLogSchema = exports.WorkflowsConfigSchema = exports.WorkflowDefinitionSchema = exports.WorkflowMetadataSchema = exports.WorkflowStatusSchema = exports.WorkflowActionSchema = exports.ChainActionSchema = exports.NotifyActionSchema = exports.McpToolActionSchema = exports.ApiCallActionSchema = exports.WebhookActionSchema = exports.DeleteActionSchema = exports.CreateActionSchema = exports.UpdateActionSchema = exports.ActionTypeSchema = exports.WorkflowTriggerSchema = exports.ManualTriggerSchema = exports.ScheduleTriggerSchema = exports.EventTriggerSchema = exports.ConditionLogicSchema = exports.WorkflowConditionSchema = exports.WorkflowOperatorSchema = void 0;
const zod_1 = require("zod");
exports.WorkflowOperatorSchema = zod_1.z.enum([
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
exports.WorkflowConditionSchema = zod_1.z.object({
    field: zod_1.z.string(),
    operator: exports.WorkflowOperatorSchema,
    value: zod_1.z.unknown(),
});
exports.ConditionLogicSchema = zod_1.z.enum(['AND', 'OR']);
exports.EventTriggerSchema = zod_1.z.object({
    type: zod_1.z.literal('event'),
    event: zod_1.z.enum(['entity.created', 'entity.updated', 'entity.deleted']),
    entity: zod_1.z.string().optional(),
    conditions: zod_1.z.array(exports.WorkflowConditionSchema).optional(),
    logic: exports.ConditionLogicSchema.optional(),
});
exports.ScheduleTriggerSchema = zod_1.z.object({
    type: zod_1.z.literal('schedule'),
    cron: zod_1.z.string(),
    entity: zod_1.z.string().optional(),
    conditions: zod_1.z.array(exports.WorkflowConditionSchema).optional(),
    logic: exports.ConditionLogicSchema.optional(),
});
exports.ManualTriggerSchema = zod_1.z.object({
    type: zod_1.z.literal('manual'),
});
exports.WorkflowTriggerSchema = zod_1.z.discriminatedUnion('type', [
    exports.EventTriggerSchema,
    exports.ScheduleTriggerSchema,
    exports.ManualTriggerSchema,
]);
exports.ActionTypeSchema = zod_1.z.enum([
    'update',
    'create',
    'delete',
    'webhook',
    'api_call',
    'mcp_tool',
    'notify',
    'chain',
]);
const BaseActionSchema = zod_1.z.object({
    type: exports.ActionTypeSchema,
});
exports.UpdateActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('update'),
    entity: zod_1.z.string(),
    entity_id: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.unknown()),
});
exports.CreateActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('create'),
    entity: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.unknown()),
});
exports.DeleteActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('delete'),
    entity: zod_1.z.string(),
    entity_id: zod_1.z.string().optional(),
});
exports.WebhookActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('webhook'),
    webhook_url: zod_1.z.string().url(),
    webhook_method: zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    data: zod_1.z.record(zod_1.z.unknown()).optional(),
    timeout: zod_1.z.number().optional(),
});
exports.ApiCallActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('api_call'),
    endpoint: zod_1.z.string(),
    method: zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    data: zod_1.z.record(zod_1.z.unknown()).optional(),
    timeout: zod_1.z.number().optional(),
});
exports.McpToolActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('mcp_tool'),
    tool_name: zod_1.z.string(),
    args: zod_1.z.record(zod_1.z.unknown()),
    tenant_id: zod_1.z.string().optional(),
    unit_id: zod_1.z.string().optional(),
});
exports.NotifyActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('notify'),
    to: zod_1.z.string(),
    subject: zod_1.z.string().optional(),
    message: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.ChainActionSchema = BaseActionSchema.extend({
    type: zod_1.z.literal('chain'),
    workflow_id: zod_1.z.string(),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.WorkflowActionSchema = zod_1.z.discriminatedUnion('type', [
    exports.UpdateActionSchema,
    exports.CreateActionSchema,
    exports.DeleteActionSchema,
    exports.WebhookActionSchema,
    exports.ApiCallActionSchema,
    exports.McpToolActionSchema,
    exports.NotifyActionSchema,
    exports.ChainActionSchema,
]);
exports.WorkflowStatusSchema = zod_1.z.enum(['active', 'inactive', 'draft']);
exports.WorkflowMetadataSchema = zod_1.z.object({
    created_by: zod_1.z.string().optional(),
    updated_by: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    version: zod_1.z.number().default(1),
});
exports.WorkflowDefinitionSchema = zod_1.z.object({
    workflow_id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    unit_id: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['event', 'schedule', 'manual']),
    enabled: zod_1.z.boolean().default(true),
    status: exports.WorkflowStatusSchema.default('active'),
    trigger: exports.WorkflowTriggerSchema,
    actions: zod_1.z.array(exports.WorkflowActionSchema),
    chained_workflows: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: exports.WorkflowMetadataSchema.optional(),
    created_at: zod_1.z.string().datetime().optional(),
    updated_at: zod_1.z.string().datetime().optional(),
});
exports.WorkflowsConfigSchema = zod_1.z.object({
    tenant_id: zod_1.z.string(),
    workflows: zod_1.z.array(exports.WorkflowDefinitionSchema),
});
exports.WorkflowExecutionLogSchema = zod_1.z.object({
    log_id: zod_1.z.string(),
    workflow_id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    unit_id: zod_1.z.string().optional(),
    execution_id: zod_1.z.string(),
    trigger_type: zod_1.z.enum(['event', 'schedule', 'manual']),
    trigger_event: zod_1.z.string().optional(),
    trigger_entity: zod_1.z.string().optional(),
    trigger_entity_id: zod_1.z.string().optional(),
    actor: zod_1.z.string().optional(),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
    started_at: zod_1.z.string().datetime(),
    completed_at: zod_1.z.string().datetime().optional(),
    duration_ms: zod_1.z.number().optional(),
    context: zod_1.z.record(zod_1.z.unknown()).optional(),
    actions_executed: zod_1.z.array(zod_1.z.object({
        action_index: zod_1.z.number(),
        action_type: exports.ActionTypeSchema,
        status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
        started_at: zod_1.z.string().datetime(),
        completed_at: zod_1.z.string().datetime().optional(),
        duration_ms: zod_1.z.number().optional(),
        result: zod_1.z.unknown().optional(),
        error: zod_1.z.string().optional(),
    })),
    error: zod_1.z.string().optional(),
    error_stack: zod_1.z.string().optional(),
    conditions_evaluated: zod_1.z
        .array(zod_1.z.object({
        condition: exports.WorkflowConditionSchema,
        result: zod_1.z.boolean(),
        field_value: zod_1.z.unknown().optional(),
    }))
        .optional(),
    chained_workflows: zod_1.z.array(zod_1.z.string()).optional(),
});
//# sourceMappingURL=workflows.js.map