import type { TenantContext } from '@crm-atlas/core';
import { EntityRepository } from '@crm-atlas/db';
import type { WorkflowAction } from '@crm-atlas/types';
import { logger } from '@crm-atlas/utils';

export interface ActionExecutionContext {
  tenant_id: string;
  unit_id: string;
  context: Record<string, unknown>;
  apiBaseUrl?: string; // For api_call actions
  mcpService?: {
    callTool: (
      tenantId: string,
      unitId: string,
      name: string,
      args: Record<string, unknown>
    ) => Promise<{ content: Array<{ type: string; text: string }>; isError: boolean }>;
  };
}

export class ActionRunner {
  private readonly repository = new EntityRepository();

  async executeAction(
    ctx: TenantContext,
    action: WorkflowAction,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (action.type) {
        case 'update':
          result = await this.executeUpdate(ctx, action, execContext);
          break;
        case 'create':
          result = await this.executeCreate(ctx, action, execContext);
          break;
        case 'delete':
          result = await this.executeDelete(ctx, action, execContext);
          break;
        case 'webhook':
          result = await this.executeWebhook(action, execContext);
          break;
        case 'api_call':
          result = await this.executeApiCall(action, execContext);
          break;
        case 'mcp_tool':
          result = await this.executeMcpTool(action, execContext);
          break;
        case 'notify':
          result = await this.executeNotify(action, execContext);
          break;
        case 'chain':
          result = await this.executeChain(action, execContext);
          break;
        default:
          throw new Error(`Unknown action type: ${(action as { type: string }).type}`);
      }

      const duration = Date.now() - startTime;
      logger.debug(`Action ${action.type} completed`, { duration_ms: duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Action ${action.type} failed`, error as Error, { duration_ms: duration });
      throw error;
    }
  }

  private async executeUpdate(
    ctx: TenantContext,
    action: Extract<WorkflowAction, { type: 'update' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    if (!action.entity) {
      throw new Error('Entity is required for update action');
    }

    const entityId = (action.entity_id || execContext.context.entity_id) as string;
    if (!entityId) {
      throw new Error('Entity ID is required for update action');
    }

    // Resolve template values in data
    const resolvedData = this.resolveTemplateValues(action.data, execContext.context);

    const updated = await this.repository.update(ctx, action.entity, entityId, resolvedData);
    if (!updated) {
      throw new Error(`Entity ${action.entity}/${entityId} not found`);
    }

    return { entity: action.entity, entity_id: entityId, updated };
  }

  private async executeCreate(
    ctx: TenantContext,
    action: Extract<WorkflowAction, { type: 'create' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    if (!action.entity) {
      throw new Error('Entity is required for create action');
    }

    // Resolve template values in data
    const resolvedData = this.resolveTemplateValues(action.data, execContext.context);

    const created = await this.repository.create(ctx, action.entity, resolvedData);
    const createdId = (created as { _id: string })._id;

    return { entity: action.entity, entity_id: createdId, created };
  }

  private async executeDelete(
    ctx: TenantContext,
    action: Extract<WorkflowAction, { type: 'delete' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    if (!action.entity) {
      throw new Error('Entity is required for delete action');
    }

    const entityId = (action.entity_id || execContext.context.entity_id) as string;
    if (!entityId) {
      throw new Error('Entity ID is required for delete action');
    }

    const deleted = await this.repository.delete(ctx, action.entity, entityId);
    if (!deleted) {
      throw new Error(`Entity ${action.entity}/${entityId} not found`);
    }

    return { entity: action.entity, entity_id: entityId, deleted: true };
  }

  private async executeWebhook(
    action: Extract<WorkflowAction, { type: 'webhook' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    if (!action.webhook_url) {
      throw new Error('webhook_url is required for webhook action');
    }

    const method = action.webhook_method || 'POST';
    const timeout = action.timeout || 30000; // Default 30 seconds

    // Resolve template values in data
    const resolvedData = action.data
      ? this.resolveTemplateValues(action.data, execContext.context)
      : execContext.context;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(action.webhook_url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...action.headers,
        },
        body: JSON.stringify(resolvedData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json().catch(() => ({}));

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Webhook timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private async executeApiCall(
    action: Extract<WorkflowAction, { type: 'api_call' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    if (!execContext.apiBaseUrl) {
      throw new Error('API base URL is required for api_call action');
    }

    const url = `${execContext.apiBaseUrl}${action.endpoint}`;
    const method = action.method || 'POST';
    const timeout = action.timeout || 30000;

    // Resolve template values in data
    const resolvedData = action.data
      ? this.resolveTemplateValues(action.data, execContext.context)
      : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...action.headers,
        },
        body: resolvedData ? JSON.stringify(resolvedData) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API call returned ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json().catch(() => ({}));

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`API call timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private async executeMcpTool(
    action: Extract<WorkflowAction, { type: 'mcp_tool' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    if (!execContext.mcpService) {
      throw new Error('MCP service is required for mcp_tool action');
    }

    const tenantId = action.tenant_id || execContext.tenant_id;
    const unitId = action.unit_id || execContext.unit_id;

    // Resolve template values in args
    const resolvedArgs = this.resolveTemplateValues(action.args, execContext.context);

    const result = await execContext.mcpService.callTool(
      tenantId,
      unitId,
      action.tool_name,
      resolvedArgs
    );

    if (result.isError) {
      throw new Error(
        `MCP tool ${action.tool_name} returned error: ${JSON.stringify(result.content)}`
      );
    }

    return result;
  }

  private async executeNotify(
    action: Extract<WorkflowAction, { type: 'notify' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    // Resolve template values in message
    const resolvedMessage = this.resolveTemplateValue(action.message, execContext.context);
    const resolvedSubject = action.subject
      ? this.resolveTemplateValue(action.subject, execContext.context)
      : undefined;

    // Placeholder for notification implementation
    // In a real implementation, this would send email, push notification, etc.
    logger.info('Notification sent', {
      to: action.to,
      subject: resolvedSubject,
      message: resolvedMessage,
    });

    return {
      to: action.to,
      subject: resolvedSubject,
      message: resolvedMessage,
      sent: true,
    };
  }

  private async executeChain(
    action: Extract<WorkflowAction, { type: 'chain' }>,
    execContext: ActionExecutionContext
  ): Promise<unknown> {
    // This will be handled by the workflow engine
    // Return the workflow ID to chain
    return {
      workflow_id: action.workflow_id,
      context: action.context || execContext.context,
    };
  }

  /**
   * Resolve template values in an object
   * Supports {{field.path}} and {{dictionary.key}} syntax
   */
  private resolveTemplateValues(
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.includes('{{')) {
        resolved[key] = this.resolveTemplateValue(value, context);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.resolveTemplateValues(value as Record<string, unknown>, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolve a single template value
   * Supports:
   * - {{field.path}} - access context fields
   * - {{dictionary.key}} - access dictionary values
   * - {{today}} - current date (ISO string)
   * - {{today+7d}} - date calculations
   * - {{now}} - current timestamp
   */
  private resolveTemplateValue(
    template: string,
    context: Record<string, unknown>
  ): string | unknown {
    if (typeof template !== 'string') {
      return template;
    }

    // Match {{...}} patterns
    const pattern = /\{\{([^}]+)\}\}/g;
    let resolved = template;

    const matches = Array.from(template.matchAll(pattern));
    for (const match of matches) {
      const expression = match[1].trim();
      let value: unknown;

      // Handle dictionary references: {{dictionary.key}}
      if (expression.startsWith('dictionary.')) {
        const dictKey = expression.substring('dictionary.'.length);
        value = this.getDictionaryValue(dictKey, context);
      }
      // Handle date calculations: {{today+7d}}, {{today-1d}}
      else if (expression.startsWith('today')) {
        value = this.resolveDateExpression(expression);
      }
      // Handle now: {{now}}
      else if (expression === 'now') {
        value = new Date().toISOString();
      }
      // Handle context field access: {{field.path}}
      else {
        value = this.getNestedValue(context, expression);
      }

      // Replace the template with the resolved value
      const stringValue = value !== undefined && value !== null ? String(value) : '';
      resolved = resolved.replace(match[0], stringValue);
    }

    // If the entire template was a single expression, return the value directly (not the string)
    if (matches.length === 1 && matches[0][0] === template) {
      const expression = matches[0][1].trim();
      let value: unknown;

      // Handle dictionary references: {{dictionary.key}}
      if (expression.startsWith('dictionary.')) {
        const dictKey = expression.substring('dictionary.'.length);
        value = this.getDictionaryValue(dictKey, context);
      }
      // Handle date calculations: {{today+7d}}, {{today-1d}}
      else if (expression.startsWith('today')) {
        value = this.resolveDateExpression(expression);
      }
      // Handle now: {{now}}
      else if (expression === 'now') {
        value = new Date().toISOString();
      }
      // Handle context field access: {{field.path}}
      else {
        value = this.getNestedValue(context, expression);
      }

      // If the resolved value is a string that contains template syntax, resolve it recursively
      if (typeof value === 'string' && value.includes('{{') && value !== template) {
        return this.resolveTemplateValue(value, context);
      }

      return value;
    }

    // If resolved still contains template syntax, resolve recursively (but prevent infinite loops)
    if (typeof resolved === 'string' && resolved.includes('{{') && resolved !== template) {
      return this.resolveTemplateValue(resolved, context);
    }

    return resolved;
  }

  /**
   * Get dictionary value from context or config
   */
  private getDictionaryValue(key: string, context: Record<string, unknown>): unknown {
    // Try to get from context first (if dictionary was passed in context)
    if (context.dictionary && typeof context.dictionary === 'object') {
      const dict = context.dictionary as Record<string, unknown>;
      const value = this.getNestedValue(dict, key);
      if (value !== undefined) {
        return value;
      }
    }

    // TODO: Load from config/dictionary.json if needed
    // For now, return undefined
    return undefined;
  }

  /**
   * Resolve date expressions like "today+7d", "today-1d"
   */
  private resolveDateExpression(expression: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Match patterns like "today+7d", "today-1d", "today+1w", etc.
    const match = expression.match(/today([+-])(\d+)([dwmy])/);
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
          days = amount * 30; // Approximate
          break;
        case 'y':
          days = amount * 365; // Approximate
          break;
      }

      if (operator === '+') {
        today.setDate(today.getDate() + days);
      } else {
        today.setDate(today.getDate() - days);
      }
    }

    return today.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }
}
