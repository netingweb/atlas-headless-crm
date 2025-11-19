import { z } from 'zod';
export declare const WorkflowOperatorSchema: z.ZodEnum<
  [
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
  ]
>;
export type WorkflowOperator = z.infer<typeof WorkflowOperatorSchema>;
export declare const WorkflowConditionSchema: z.ZodObject<
  {
    field: z.ZodString;
    operator: z.ZodEnum<
      [
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
      ]
    >;
    value: z.ZodUnknown;
  },
  'strip',
  z.ZodTypeAny,
  {
    field: string;
    operator:
      | '=='
      | '!='
      | '>'
      | '<'
      | '>='
      | '<='
      | 'contains'
      | 'in'
      | 'startsWith'
      | 'endsWith'
      | 'isEmpty'
      | 'isNotEmpty';
    value?: unknown;
  },
  {
    field: string;
    operator:
      | '=='
      | '!='
      | '>'
      | '<'
      | '>='
      | '<='
      | 'contains'
      | 'in'
      | 'startsWith'
      | 'endsWith'
      | 'isEmpty'
      | 'isNotEmpty';
    value?: unknown;
  }
>;
export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;
export declare const ConditionLogicSchema: z.ZodEnum<['AND', 'OR']>;
export type ConditionLogic = z.infer<typeof ConditionLogicSchema>;
export declare const EventTriggerSchema: z.ZodObject<
  {
    type: z.ZodLiteral<'event'>;
    event: z.ZodEnum<['entity.created', 'entity.updated', 'entity.deleted']>;
    entity: z.ZodOptional<z.ZodString>;
    conditions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            field: z.ZodString;
            operator: z.ZodEnum<
              [
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
              ]
            >;
            value: z.ZodUnknown;
          },
          'strip',
          z.ZodTypeAny,
          {
            field: string;
            operator:
              | '=='
              | '!='
              | '>'
              | '<'
              | '>='
              | '<='
              | 'contains'
              | 'in'
              | 'startsWith'
              | 'endsWith'
              | 'isEmpty'
              | 'isNotEmpty';
            value?: unknown;
          },
          {
            field: string;
            operator:
              | '=='
              | '!='
              | '>'
              | '<'
              | '>='
              | '<='
              | 'contains'
              | 'in'
              | 'startsWith'
              | 'endsWith'
              | 'isEmpty'
              | 'isNotEmpty';
            value?: unknown;
          }
        >,
        'many'
      >
    >;
    logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'event';
    event: 'entity.created' | 'entity.updated' | 'entity.deleted';
    entity?: string | undefined;
    conditions?:
      | {
          field: string;
          operator:
            | '=='
            | '!='
            | '>'
            | '<'
            | '>='
            | '<='
            | 'contains'
            | 'in'
            | 'startsWith'
            | 'endsWith'
            | 'isEmpty'
            | 'isNotEmpty';
          value?: unknown;
        }[]
      | undefined;
    logic?: 'AND' | 'OR' | undefined;
  },
  {
    type: 'event';
    event: 'entity.created' | 'entity.updated' | 'entity.deleted';
    entity?: string | undefined;
    conditions?:
      | {
          field: string;
          operator:
            | '=='
            | '!='
            | '>'
            | '<'
            | '>='
            | '<='
            | 'contains'
            | 'in'
            | 'startsWith'
            | 'endsWith'
            | 'isEmpty'
            | 'isNotEmpty';
          value?: unknown;
        }[]
      | undefined;
    logic?: 'AND' | 'OR' | undefined;
  }
>;
export type EventTrigger = z.infer<typeof EventTriggerSchema>;
export declare const ScheduleTriggerSchema: z.ZodObject<
  {
    type: z.ZodLiteral<'schedule'>;
    cron: z.ZodString;
    entity: z.ZodOptional<z.ZodString>;
    conditions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            field: z.ZodString;
            operator: z.ZodEnum<
              [
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
              ]
            >;
            value: z.ZodUnknown;
          },
          'strip',
          z.ZodTypeAny,
          {
            field: string;
            operator:
              | '=='
              | '!='
              | '>'
              | '<'
              | '>='
              | '<='
              | 'contains'
              | 'in'
              | 'startsWith'
              | 'endsWith'
              | 'isEmpty'
              | 'isNotEmpty';
            value?: unknown;
          },
          {
            field: string;
            operator:
              | '=='
              | '!='
              | '>'
              | '<'
              | '>='
              | '<='
              | 'contains'
              | 'in'
              | 'startsWith'
              | 'endsWith'
              | 'isEmpty'
              | 'isNotEmpty';
            value?: unknown;
          }
        >,
        'many'
      >
    >;
    logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'schedule';
    cron: string;
    entity?: string | undefined;
    conditions?:
      | {
          field: string;
          operator:
            | '=='
            | '!='
            | '>'
            | '<'
            | '>='
            | '<='
            | 'contains'
            | 'in'
            | 'startsWith'
            | 'endsWith'
            | 'isEmpty'
            | 'isNotEmpty';
          value?: unknown;
        }[]
      | undefined;
    logic?: 'AND' | 'OR' | undefined;
  },
  {
    type: 'schedule';
    cron: string;
    entity?: string | undefined;
    conditions?:
      | {
          field: string;
          operator:
            | '=='
            | '!='
            | '>'
            | '<'
            | '>='
            | '<='
            | 'contains'
            | 'in'
            | 'startsWith'
            | 'endsWith'
            | 'isEmpty'
            | 'isNotEmpty';
          value?: unknown;
        }[]
      | undefined;
    logic?: 'AND' | 'OR' | undefined;
  }
>;
export type ScheduleTrigger = z.infer<typeof ScheduleTriggerSchema>;
export declare const ManualTriggerSchema: z.ZodObject<
  {
    type: z.ZodLiteral<'manual'>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'manual';
  },
  {
    type: 'manual';
  }
>;
export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;
export declare const WorkflowTriggerSchema: z.ZodDiscriminatedUnion<
  'type',
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<'event'>;
        event: z.ZodEnum<['entity.created', 'entity.updated', 'entity.deleted']>;
        entity: z.ZodOptional<z.ZodString>;
        conditions: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                field: z.ZodString;
                operator: z.ZodEnum<
                  [
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
                  ]
                >;
                value: z.ZodUnknown;
              },
              'strip',
              z.ZodTypeAny,
              {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              },
              {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }
            >,
            'many'
          >
        >;
        logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        type: 'event';
        event: 'entity.created' | 'entity.updated' | 'entity.deleted';
        entity?: string | undefined;
        conditions?:
          | {
              field: string;
              operator:
                | '=='
                | '!='
                | '>'
                | '<'
                | '>='
                | '<='
                | 'contains'
                | 'in'
                | 'startsWith'
                | 'endsWith'
                | 'isEmpty'
                | 'isNotEmpty';
              value?: unknown;
            }[]
          | undefined;
        logic?: 'AND' | 'OR' | undefined;
      },
      {
        type: 'event';
        event: 'entity.created' | 'entity.updated' | 'entity.deleted';
        entity?: string | undefined;
        conditions?:
          | {
              field: string;
              operator:
                | '=='
                | '!='
                | '>'
                | '<'
                | '>='
                | '<='
                | 'contains'
                | 'in'
                | 'startsWith'
                | 'endsWith'
                | 'isEmpty'
                | 'isNotEmpty';
              value?: unknown;
            }[]
          | undefined;
        logic?: 'AND' | 'OR' | undefined;
      }
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'schedule'>;
        cron: z.ZodString;
        entity: z.ZodOptional<z.ZodString>;
        conditions: z.ZodOptional<
          z.ZodArray<
            z.ZodObject<
              {
                field: z.ZodString;
                operator: z.ZodEnum<
                  [
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
                  ]
                >;
                value: z.ZodUnknown;
              },
              'strip',
              z.ZodTypeAny,
              {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              },
              {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }
            >,
            'many'
          >
        >;
        logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
      },
      'strip',
      z.ZodTypeAny,
      {
        type: 'schedule';
        cron: string;
        entity?: string | undefined;
        conditions?:
          | {
              field: string;
              operator:
                | '=='
                | '!='
                | '>'
                | '<'
                | '>='
                | '<='
                | 'contains'
                | 'in'
                | 'startsWith'
                | 'endsWith'
                | 'isEmpty'
                | 'isNotEmpty';
              value?: unknown;
            }[]
          | undefined;
        logic?: 'AND' | 'OR' | undefined;
      },
      {
        type: 'schedule';
        cron: string;
        entity?: string | undefined;
        conditions?:
          | {
              field: string;
              operator:
                | '=='
                | '!='
                | '>'
                | '<'
                | '>='
                | '<='
                | 'contains'
                | 'in'
                | 'startsWith'
                | 'endsWith'
                | 'isEmpty'
                | 'isNotEmpty';
              value?: unknown;
            }[]
          | undefined;
        logic?: 'AND' | 'OR' | undefined;
      }
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'manual'>;
      },
      'strip',
      z.ZodTypeAny,
      {
        type: 'manual';
      },
      {
        type: 'manual';
      }
    >,
  ]
>;
export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;
export declare const ActionTypeSchema: z.ZodEnum<
  ['update', 'create', 'delete', 'webhook', 'api_call', 'mcp_tool', 'notify', 'chain']
>;
export type ActionType = z.infer<typeof ActionTypeSchema>;
export declare const UpdateActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'update'>;
    entity: z.ZodString;
    entity_id: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'update';
    entity: string;
    data: Record<string, unknown>;
    entity_id?: string | undefined;
  },
  {
    type: 'update';
    entity: string;
    data: Record<string, unknown>;
    entity_id?: string | undefined;
  }
>;
export declare const CreateActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'create'>;
    entity: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'create';
    entity: string;
    data: Record<string, unknown>;
  },
  {
    type: 'create';
    entity: string;
    data: Record<string, unknown>;
  }
>;
export declare const DeleteActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'delete'>;
    entity: z.ZodString;
    entity_id: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'delete';
    entity: string;
    entity_id?: string | undefined;
  },
  {
    type: 'delete';
    entity: string;
    entity_id?: string | undefined;
  }
>;
export declare const WebhookActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'webhook'>;
    webhook_url: z.ZodString;
    webhook_method: z.ZodDefault<z.ZodEnum<['GET', 'POST', 'PUT', 'DELETE', 'PATCH']>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timeout: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'webhook';
    webhook_url: string;
    webhook_method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data?: Record<string, unknown> | undefined;
    headers?: Record<string, string> | undefined;
    timeout?: number | undefined;
  },
  {
    type: 'webhook';
    webhook_url: string;
    data?: Record<string, unknown> | undefined;
    webhook_method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined;
    headers?: Record<string, string> | undefined;
    timeout?: number | undefined;
  }
>;
export declare const ApiCallActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'api_call'>;
    endpoint: z.ZodString;
    method: z.ZodDefault<z.ZodEnum<['GET', 'POST', 'PUT', 'DELETE', 'PATCH']>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timeout: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'api_call';
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data?: Record<string, unknown> | undefined;
    headers?: Record<string, string> | undefined;
    timeout?: number | undefined;
  },
  {
    type: 'api_call';
    endpoint: string;
    data?: Record<string, unknown> | undefined;
    headers?: Record<string, string> | undefined;
    timeout?: number | undefined;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined;
  }
>;
export declare const McpToolActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'mcp_tool'>;
    tool_name: z.ZodString;
    args: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    tenant_id: z.ZodOptional<z.ZodString>;
    unit_id: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'mcp_tool';
    tool_name: string;
    args: Record<string, unknown>;
    tenant_id?: string | undefined;
    unit_id?: string | undefined;
  },
  {
    type: 'mcp_tool';
    tool_name: string;
    args: Record<string, unknown>;
    tenant_id?: string | undefined;
    unit_id?: string | undefined;
  }
>;
export declare const NotifyActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'notify'>;
    to: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    message: string;
    type: 'notify';
    to: string;
    data?: Record<string, unknown> | undefined;
    subject?: string | undefined;
  },
  {
    message: string;
    type: 'notify';
    to: string;
    data?: Record<string, unknown> | undefined;
    subject?: string | undefined;
  }
>;
export declare const ChainActionSchema: z.ZodObject<
  {} & {
    type: z.ZodLiteral<'chain'>;
    workflow_id: z.ZodString;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'chain';
    workflow_id: string;
    context?: Record<string, unknown> | undefined;
  },
  {
    type: 'chain';
    workflow_id: string;
    context?: Record<string, unknown> | undefined;
  }
>;
export declare const WorkflowActionSchema: z.ZodType<WorkflowAction>;
export type WorkflowAction =
  | z.infer<typeof UpdateActionSchema>
  | z.infer<typeof CreateActionSchema>
  | z.infer<typeof DeleteActionSchema>
  | z.infer<typeof WebhookActionSchema>
  | z.infer<typeof ApiCallActionSchema>
  | z.infer<typeof McpToolActionSchema>
  | z.infer<typeof NotifyActionSchema>
  | z.infer<typeof ChainActionSchema>;
export declare const WorkflowStatusSchema: z.ZodEnum<['active', 'inactive', 'draft']>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export declare const WorkflowMetadataSchema: z.ZodObject<
  {
    created_by: z.ZodOptional<z.ZodString>;
    updated_by: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    version: z.ZodDefault<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    version: number;
    created_by?: string | undefined;
    updated_by?: string | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
  },
  {
    created_by?: string | undefined;
    updated_by?: string | undefined;
    description?: string | undefined;
    tags?: string[] | undefined;
    version?: number | undefined;
  }
>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export declare const WorkflowDefinitionSchema: z.ZodObject<
  {
    workflow_id: z.ZodString;
    tenant_id: z.ZodString;
    unit_id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    type: z.ZodEnum<['event', 'schedule', 'manual']>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodDefault<z.ZodEnum<['active', 'inactive', 'draft']>>;
    trigger: z.ZodDiscriminatedUnion<
      'type',
      [
        z.ZodObject<
          {
            type: z.ZodLiteral<'event'>;
            event: z.ZodEnum<['entity.created', 'entity.updated', 'entity.deleted']>;
            entity: z.ZodOptional<z.ZodString>;
            conditions: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    field: z.ZodString;
                    operator: z.ZodEnum<
                      [
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
                      ]
                    >;
                    value: z.ZodUnknown;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    field: string;
                    operator:
                      | '=='
                      | '!='
                      | '>'
                      | '<'
                      | '>='
                      | '<='
                      | 'contains'
                      | 'in'
                      | 'startsWith'
                      | 'endsWith'
                      | 'isEmpty'
                      | 'isNotEmpty';
                    value?: unknown;
                  },
                  {
                    field: string;
                    operator:
                      | '=='
                      | '!='
                      | '>'
                      | '<'
                      | '>='
                      | '<='
                      | 'contains'
                      | 'in'
                      | 'startsWith'
                      | 'endsWith'
                      | 'isEmpty'
                      | 'isNotEmpty';
                    value?: unknown;
                  }
                >,
                'many'
              >
            >;
            logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: 'event';
            event: 'entity.created' | 'entity.updated' | 'entity.deleted';
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          },
          {
            type: 'event';
            event: 'entity.created' | 'entity.updated' | 'entity.deleted';
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          }
        >,
        z.ZodObject<
          {
            type: z.ZodLiteral<'schedule'>;
            cron: z.ZodString;
            entity: z.ZodOptional<z.ZodString>;
            conditions: z.ZodOptional<
              z.ZodArray<
                z.ZodObject<
                  {
                    field: z.ZodString;
                    operator: z.ZodEnum<
                      [
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
                      ]
                    >;
                    value: z.ZodUnknown;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    field: string;
                    operator:
                      | '=='
                      | '!='
                      | '>'
                      | '<'
                      | '>='
                      | '<='
                      | 'contains'
                      | 'in'
                      | 'startsWith'
                      | 'endsWith'
                      | 'isEmpty'
                      | 'isNotEmpty';
                    value?: unknown;
                  },
                  {
                    field: string;
                    operator:
                      | '=='
                      | '!='
                      | '>'
                      | '<'
                      | '>='
                      | '<='
                      | 'contains'
                      | 'in'
                      | 'startsWith'
                      | 'endsWith'
                      | 'isEmpty'
                      | 'isNotEmpty';
                    value?: unknown;
                  }
                >,
                'many'
              >
            >;
            logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: 'schedule';
            cron: string;
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          },
          {
            type: 'schedule';
            cron: string;
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          }
        >,
        z.ZodObject<
          {
            type: z.ZodLiteral<'manual'>;
          },
          'strip',
          z.ZodTypeAny,
          {
            type: 'manual';
          },
          {
            type: 'manual';
          }
        >,
      ]
    >;
    actions: z.ZodArray<z.ZodType<WorkflowAction, z.ZodTypeDef, WorkflowAction>, 'many'>;
    chained_workflows: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
    metadata: z.ZodOptional<
      z.ZodObject<
        {
          created_by: z.ZodOptional<z.ZodString>;
          updated_by: z.ZodOptional<z.ZodString>;
          description: z.ZodOptional<z.ZodString>;
          tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          version: z.ZodDefault<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          version: number;
          created_by?: string | undefined;
          updated_by?: string | undefined;
          description?: string | undefined;
          tags?: string[] | undefined;
        },
        {
          created_by?: string | undefined;
          updated_by?: string | undefined;
          description?: string | undefined;
          tags?: string[] | undefined;
          version?: number | undefined;
        }
      >
    >;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    type: 'event' | 'schedule' | 'manual';
    status: 'active' | 'inactive' | 'draft';
    name: string;
    tenant_id: string;
    workflow_id: string;
    enabled: boolean;
    trigger:
      | {
          type: 'event';
          event: 'entity.created' | 'entity.updated' | 'entity.deleted';
          entity?: string | undefined;
          conditions?:
            | {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }[]
            | undefined;
          logic?: 'AND' | 'OR' | undefined;
        }
      | {
          type: 'schedule';
          cron: string;
          entity?: string | undefined;
          conditions?:
            | {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }[]
            | undefined;
          logic?: 'AND' | 'OR' | undefined;
        }
      | {
          type: 'manual';
        };
    actions: WorkflowAction[];
    unit_id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    chained_workflows?: string[] | undefined;
    metadata?:
      | {
          version: number;
          created_by?: string | undefined;
          updated_by?: string | undefined;
          description?: string | undefined;
          tags?: string[] | undefined;
        }
      | undefined;
  },
  {
    type: 'event' | 'schedule' | 'manual';
    name: string;
    tenant_id: string;
    workflow_id: string;
    trigger:
      | {
          type: 'event';
          event: 'entity.created' | 'entity.updated' | 'entity.deleted';
          entity?: string | undefined;
          conditions?:
            | {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }[]
            | undefined;
          logic?: 'AND' | 'OR' | undefined;
        }
      | {
          type: 'schedule';
          cron: string;
          entity?: string | undefined;
          conditions?:
            | {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }[]
            | undefined;
          logic?: 'AND' | 'OR' | undefined;
        }
      | {
          type: 'manual';
        };
    actions: WorkflowAction[];
    status?: 'active' | 'inactive' | 'draft' | undefined;
    unit_id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    enabled?: boolean | undefined;
    chained_workflows?: string[] | undefined;
    metadata?:
      | {
          created_by?: string | undefined;
          updated_by?: string | undefined;
          description?: string | undefined;
          tags?: string[] | undefined;
          version?: number | undefined;
        }
      | undefined;
  }
>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export declare const WorkflowsConfigSchema: z.ZodObject<
  {
    tenant_id: z.ZodString;
    workflows: z.ZodArray<
      z.ZodObject<
        {
          workflow_id: z.ZodString;
          tenant_id: z.ZodString;
          unit_id: z.ZodOptional<z.ZodString>;
          name: z.ZodString;
          type: z.ZodEnum<['event', 'schedule', 'manual']>;
          enabled: z.ZodDefault<z.ZodBoolean>;
          status: z.ZodDefault<z.ZodEnum<['active', 'inactive', 'draft']>>;
          trigger: z.ZodDiscriminatedUnion<
            'type',
            [
              z.ZodObject<
                {
                  type: z.ZodLiteral<'event'>;
                  event: z.ZodEnum<['entity.created', 'entity.updated', 'entity.deleted']>;
                  entity: z.ZodOptional<z.ZodString>;
                  conditions: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          field: z.ZodString;
                          operator: z.ZodEnum<
                            [
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
                            ]
                          >;
                          value: z.ZodUnknown;
                        },
                        'strip',
                        z.ZodTypeAny,
                        {
                          field: string;
                          operator:
                            | '=='
                            | '!='
                            | '>'
                            | '<'
                            | '>='
                            | '<='
                            | 'contains'
                            | 'in'
                            | 'startsWith'
                            | 'endsWith'
                            | 'isEmpty'
                            | 'isNotEmpty';
                          value?: unknown;
                        },
                        {
                          field: string;
                          operator:
                            | '=='
                            | '!='
                            | '>'
                            | '<'
                            | '>='
                            | '<='
                            | 'contains'
                            | 'in'
                            | 'startsWith'
                            | 'endsWith'
                            | 'isEmpty'
                            | 'isNotEmpty';
                          value?: unknown;
                        }
                      >,
                      'many'
                    >
                  >;
                  logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  type: 'event';
                  event: 'entity.created' | 'entity.updated' | 'entity.deleted';
                  entity?: string | undefined;
                  conditions?:
                    | {
                        field: string;
                        operator:
                          | '=='
                          | '!='
                          | '>'
                          | '<'
                          | '>='
                          | '<='
                          | 'contains'
                          | 'in'
                          | 'startsWith'
                          | 'endsWith'
                          | 'isEmpty'
                          | 'isNotEmpty';
                        value?: unknown;
                      }[]
                    | undefined;
                  logic?: 'AND' | 'OR' | undefined;
                },
                {
                  type: 'event';
                  event: 'entity.created' | 'entity.updated' | 'entity.deleted';
                  entity?: string | undefined;
                  conditions?:
                    | {
                        field: string;
                        operator:
                          | '=='
                          | '!='
                          | '>'
                          | '<'
                          | '>='
                          | '<='
                          | 'contains'
                          | 'in'
                          | 'startsWith'
                          | 'endsWith'
                          | 'isEmpty'
                          | 'isNotEmpty';
                        value?: unknown;
                      }[]
                    | undefined;
                  logic?: 'AND' | 'OR' | undefined;
                }
              >,
              z.ZodObject<
                {
                  type: z.ZodLiteral<'schedule'>;
                  cron: z.ZodString;
                  entity: z.ZodOptional<z.ZodString>;
                  conditions: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          field: z.ZodString;
                          operator: z.ZodEnum<
                            [
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
                            ]
                          >;
                          value: z.ZodUnknown;
                        },
                        'strip',
                        z.ZodTypeAny,
                        {
                          field: string;
                          operator:
                            | '=='
                            | '!='
                            | '>'
                            | '<'
                            | '>='
                            | '<='
                            | 'contains'
                            | 'in'
                            | 'startsWith'
                            | 'endsWith'
                            | 'isEmpty'
                            | 'isNotEmpty';
                          value?: unknown;
                        },
                        {
                          field: string;
                          operator:
                            | '=='
                            | '!='
                            | '>'
                            | '<'
                            | '>='
                            | '<='
                            | 'contains'
                            | 'in'
                            | 'startsWith'
                            | 'endsWith'
                            | 'isEmpty'
                            | 'isNotEmpty';
                          value?: unknown;
                        }
                      >,
                      'many'
                    >
                  >;
                  logic: z.ZodOptional<z.ZodEnum<['AND', 'OR']>>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  type: 'schedule';
                  cron: string;
                  entity?: string | undefined;
                  conditions?:
                    | {
                        field: string;
                        operator:
                          | '=='
                          | '!='
                          | '>'
                          | '<'
                          | '>='
                          | '<='
                          | 'contains'
                          | 'in'
                          | 'startsWith'
                          | 'endsWith'
                          | 'isEmpty'
                          | 'isNotEmpty';
                        value?: unknown;
                      }[]
                    | undefined;
                  logic?: 'AND' | 'OR' | undefined;
                },
                {
                  type: 'schedule';
                  cron: string;
                  entity?: string | undefined;
                  conditions?:
                    | {
                        field: string;
                        operator:
                          | '=='
                          | '!='
                          | '>'
                          | '<'
                          | '>='
                          | '<='
                          | 'contains'
                          | 'in'
                          | 'startsWith'
                          | 'endsWith'
                          | 'isEmpty'
                          | 'isNotEmpty';
                        value?: unknown;
                      }[]
                    | undefined;
                  logic?: 'AND' | 'OR' | undefined;
                }
              >,
              z.ZodObject<
                {
                  type: z.ZodLiteral<'manual'>;
                },
                'strip',
                z.ZodTypeAny,
                {
                  type: 'manual';
                },
                {
                  type: 'manual';
                }
              >,
            ]
          >;
          actions: z.ZodArray<z.ZodType<WorkflowAction, z.ZodTypeDef, WorkflowAction>, 'many'>;
          chained_workflows: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
          metadata: z.ZodOptional<
            z.ZodObject<
              {
                created_by: z.ZodOptional<z.ZodString>;
                updated_by: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                tags: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
                version: z.ZodDefault<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                version: number;
                created_by?: string | undefined;
                updated_by?: string | undefined;
                description?: string | undefined;
                tags?: string[] | undefined;
              },
              {
                created_by?: string | undefined;
                updated_by?: string | undefined;
                description?: string | undefined;
                tags?: string[] | undefined;
                version?: number | undefined;
              }
            >
          >;
          created_at: z.ZodOptional<z.ZodString>;
          updated_at: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          type: 'event' | 'schedule' | 'manual';
          status: 'active' | 'inactive' | 'draft';
          name: string;
          tenant_id: string;
          workflow_id: string;
          enabled: boolean;
          trigger:
            | {
                type: 'event';
                event: 'entity.created' | 'entity.updated' | 'entity.deleted';
                entity?: string | undefined;
                conditions?:
                  | {
                      field: string;
                      operator:
                        | '=='
                        | '!='
                        | '>'
                        | '<'
                        | '>='
                        | '<='
                        | 'contains'
                        | 'in'
                        | 'startsWith'
                        | 'endsWith'
                        | 'isEmpty'
                        | 'isNotEmpty';
                      value?: unknown;
                    }[]
                  | undefined;
                logic?: 'AND' | 'OR' | undefined;
              }
            | {
                type: 'schedule';
                cron: string;
                entity?: string | undefined;
                conditions?:
                  | {
                      field: string;
                      operator:
                        | '=='
                        | '!='
                        | '>'
                        | '<'
                        | '>='
                        | '<='
                        | 'contains'
                        | 'in'
                        | 'startsWith'
                        | 'endsWith'
                        | 'isEmpty'
                        | 'isNotEmpty';
                      value?: unknown;
                    }[]
                  | undefined;
                logic?: 'AND' | 'OR' | undefined;
              }
            | {
                type: 'manual';
              };
          actions: WorkflowAction[];
          unit_id?: string | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
          chained_workflows?: string[] | undefined;
          metadata?:
            | {
                version: number;
                created_by?: string | undefined;
                updated_by?: string | undefined;
                description?: string | undefined;
                tags?: string[] | undefined;
              }
            | undefined;
        },
        {
          type: 'event' | 'schedule' | 'manual';
          name: string;
          tenant_id: string;
          workflow_id: string;
          trigger:
            | {
                type: 'event';
                event: 'entity.created' | 'entity.updated' | 'entity.deleted';
                entity?: string | undefined;
                conditions?:
                  | {
                      field: string;
                      operator:
                        | '=='
                        | '!='
                        | '>'
                        | '<'
                        | '>='
                        | '<='
                        | 'contains'
                        | 'in'
                        | 'startsWith'
                        | 'endsWith'
                        | 'isEmpty'
                        | 'isNotEmpty';
                      value?: unknown;
                    }[]
                  | undefined;
                logic?: 'AND' | 'OR' | undefined;
              }
            | {
                type: 'schedule';
                cron: string;
                entity?: string | undefined;
                conditions?:
                  | {
                      field: string;
                      operator:
                        | '=='
                        | '!='
                        | '>'
                        | '<'
                        | '>='
                        | '<='
                        | 'contains'
                        | 'in'
                        | 'startsWith'
                        | 'endsWith'
                        | 'isEmpty'
                        | 'isNotEmpty';
                      value?: unknown;
                    }[]
                  | undefined;
                logic?: 'AND' | 'OR' | undefined;
              }
            | {
                type: 'manual';
              };
          actions: WorkflowAction[];
          status?: 'active' | 'inactive' | 'draft' | undefined;
          unit_id?: string | undefined;
          created_at?: string | undefined;
          updated_at?: string | undefined;
          enabled?: boolean | undefined;
          chained_workflows?: string[] | undefined;
          metadata?:
            | {
                created_by?: string | undefined;
                updated_by?: string | undefined;
                description?: string | undefined;
                tags?: string[] | undefined;
                version?: number | undefined;
              }
            | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    workflows: {
      type: 'event' | 'schedule' | 'manual';
      status: 'active' | 'inactive' | 'draft';
      name: string;
      tenant_id: string;
      workflow_id: string;
      enabled: boolean;
      trigger:
        | {
            type: 'event';
            event: 'entity.created' | 'entity.updated' | 'entity.deleted';
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          }
        | {
            type: 'schedule';
            cron: string;
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          }
        | {
            type: 'manual';
          };
      actions: WorkflowAction[];
      unit_id?: string | undefined;
      created_at?: string | undefined;
      updated_at?: string | undefined;
      chained_workflows?: string[] | undefined;
      metadata?:
        | {
            version: number;
            created_by?: string | undefined;
            updated_by?: string | undefined;
            description?: string | undefined;
            tags?: string[] | undefined;
          }
        | undefined;
    }[];
  },
  {
    tenant_id: string;
    workflows: {
      type: 'event' | 'schedule' | 'manual';
      name: string;
      tenant_id: string;
      workflow_id: string;
      trigger:
        | {
            type: 'event';
            event: 'entity.created' | 'entity.updated' | 'entity.deleted';
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          }
        | {
            type: 'schedule';
            cron: string;
            entity?: string | undefined;
            conditions?:
              | {
                  field: string;
                  operator:
                    | '=='
                    | '!='
                    | '>'
                    | '<'
                    | '>='
                    | '<='
                    | 'contains'
                    | 'in'
                    | 'startsWith'
                    | 'endsWith'
                    | 'isEmpty'
                    | 'isNotEmpty';
                  value?: unknown;
                }[]
              | undefined;
            logic?: 'AND' | 'OR' | undefined;
          }
        | {
            type: 'manual';
          };
      actions: WorkflowAction[];
      status?: 'active' | 'inactive' | 'draft' | undefined;
      unit_id?: string | undefined;
      created_at?: string | undefined;
      updated_at?: string | undefined;
      enabled?: boolean | undefined;
      chained_workflows?: string[] | undefined;
      metadata?:
        | {
            created_by?: string | undefined;
            updated_by?: string | undefined;
            description?: string | undefined;
            tags?: string[] | undefined;
            version?: number | undefined;
          }
        | undefined;
    }[];
  }
>;
export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;
export declare const WorkflowExecutionLogSchema: z.ZodObject<
  {
    log_id: z.ZodString;
    workflow_id: z.ZodString;
    tenant_id: z.ZodString;
    unit_id: z.ZodOptional<z.ZodString>;
    execution_id: z.ZodString;
    trigger_type: z.ZodEnum<['event', 'schedule', 'manual']>;
    trigger_event: z.ZodOptional<z.ZodString>;
    trigger_entity: z.ZodOptional<z.ZodString>;
    trigger_entity_id: z.ZodOptional<z.ZodString>;
    actor: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<['pending', 'running', 'completed', 'failed', 'skipped']>;
    started_at: z.ZodString;
    completed_at: z.ZodOptional<z.ZodString>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    actions_executed: z.ZodArray<
      z.ZodObject<
        {
          action_index: z.ZodNumber;
          action_type: z.ZodEnum<
            ['update', 'create', 'delete', 'webhook', 'api_call', 'mcp_tool', 'notify', 'chain']
          >;
          status: z.ZodEnum<['pending', 'running', 'completed', 'failed', 'skipped']>;
          started_at: z.ZodString;
          completed_at: z.ZodOptional<z.ZodString>;
          duration_ms: z.ZodOptional<z.ZodNumber>;
          result: z.ZodOptional<z.ZodUnknown>;
          error: z.ZodOptional<z.ZodString>;
        },
        'strip',
        z.ZodTypeAny,
        {
          status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
          started_at: string;
          action_index: number;
          action_type:
            | 'update'
            | 'create'
            | 'delete'
            | 'webhook'
            | 'api_call'
            | 'mcp_tool'
            | 'notify'
            | 'chain';
          completed_at?: string | undefined;
          duration_ms?: number | undefined;
          result?: unknown;
          error?: string | undefined;
        },
        {
          status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
          started_at: string;
          action_index: number;
          action_type:
            | 'update'
            | 'create'
            | 'delete'
            | 'webhook'
            | 'api_call'
            | 'mcp_tool'
            | 'notify'
            | 'chain';
          completed_at?: string | undefined;
          duration_ms?: number | undefined;
          result?: unknown;
          error?: string | undefined;
        }
      >,
      'many'
    >;
    error: z.ZodOptional<z.ZodString>;
    error_stack: z.ZodOptional<z.ZodString>;
    conditions_evaluated: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            condition: z.ZodObject<
              {
                field: z.ZodString;
                operator: z.ZodEnum<
                  [
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
                  ]
                >;
                value: z.ZodUnknown;
              },
              'strip',
              z.ZodTypeAny,
              {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              },
              {
                field: string;
                operator:
                  | '=='
                  | '!='
                  | '>'
                  | '<'
                  | '>='
                  | '<='
                  | 'contains'
                  | 'in'
                  | 'startsWith'
                  | 'endsWith'
                  | 'isEmpty'
                  | 'isNotEmpty';
                value?: unknown;
              }
            >;
            result: z.ZodBoolean;
            field_value: z.ZodOptional<z.ZodUnknown>;
          },
          'strip',
          z.ZodTypeAny,
          {
            result: boolean;
            condition: {
              field: string;
              operator:
                | '=='
                | '!='
                | '>'
                | '<'
                | '>='
                | '<='
                | 'contains'
                | 'in'
                | 'startsWith'
                | 'endsWith'
                | 'isEmpty'
                | 'isNotEmpty';
              value?: unknown;
            };
            field_value?: unknown;
          },
          {
            result: boolean;
            condition: {
              field: string;
              operator:
                | '=='
                | '!='
                | '>'
                | '<'
                | '>='
                | '<='
                | 'contains'
                | 'in'
                | 'startsWith'
                | 'endsWith'
                | 'isEmpty'
                | 'isNotEmpty';
              value?: unknown;
            };
            field_value?: unknown;
          }
        >,
        'many'
      >
    >;
    chained_workflows: z.ZodOptional<z.ZodArray<z.ZodString, 'many'>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    tenant_id: string;
    workflow_id: string;
    log_id: string;
    execution_id: string;
    trigger_type: 'event' | 'schedule' | 'manual';
    started_at: string;
    actions_executed: {
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      started_at: string;
      action_index: number;
      action_type:
        | 'update'
        | 'create'
        | 'delete'
        | 'webhook'
        | 'api_call'
        | 'mcp_tool'
        | 'notify'
        | 'chain';
      completed_at?: string | undefined;
      duration_ms?: number | undefined;
      result?: unknown;
      error?: string | undefined;
    }[];
    unit_id?: string | undefined;
    context?: Record<string, unknown> | undefined;
    chained_workflows?: string[] | undefined;
    trigger_event?: string | undefined;
    trigger_entity?: string | undefined;
    trigger_entity_id?: string | undefined;
    actor?: string | undefined;
    completed_at?: string | undefined;
    duration_ms?: number | undefined;
    error?: string | undefined;
    error_stack?: string | undefined;
    conditions_evaluated?:
      | {
          result: boolean;
          condition: {
            field: string;
            operator:
              | '=='
              | '!='
              | '>'
              | '<'
              | '>='
              | '<='
              | 'contains'
              | 'in'
              | 'startsWith'
              | 'endsWith'
              | 'isEmpty'
              | 'isNotEmpty';
            value?: unknown;
          };
          field_value?: unknown;
        }[]
      | undefined;
  },
  {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    tenant_id: string;
    workflow_id: string;
    log_id: string;
    execution_id: string;
    trigger_type: 'event' | 'schedule' | 'manual';
    started_at: string;
    actions_executed: {
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      started_at: string;
      action_index: number;
      action_type:
        | 'update'
        | 'create'
        | 'delete'
        | 'webhook'
        | 'api_call'
        | 'mcp_tool'
        | 'notify'
        | 'chain';
      completed_at?: string | undefined;
      duration_ms?: number | undefined;
      result?: unknown;
      error?: string | undefined;
    }[];
    unit_id?: string | undefined;
    context?: Record<string, unknown> | undefined;
    chained_workflows?: string[] | undefined;
    trigger_event?: string | undefined;
    trigger_entity?: string | undefined;
    trigger_entity_id?: string | undefined;
    actor?: string | undefined;
    completed_at?: string | undefined;
    duration_ms?: number | undefined;
    error?: string | undefined;
    error_stack?: string | undefined;
    conditions_evaluated?:
      | {
          result: boolean;
          condition: {
            field: string;
            operator:
              | '=='
              | '!='
              | '>'
              | '<'
              | '>='
              | '<='
              | 'contains'
              | 'in'
              | 'startsWith'
              | 'endsWith'
              | 'isEmpty'
              | 'isNotEmpty';
            value?: unknown;
          };
          field_value?: unknown;
        }[]
      | undefined;
  }
>;
export type WorkflowExecutionLog = z.infer<typeof WorkflowExecutionLogSchema>;
//# sourceMappingURL=workflows.d.ts.map
