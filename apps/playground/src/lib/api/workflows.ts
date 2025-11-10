import { apiClient } from './client';
import type { WorkflowDefinition, WorkflowExecutionLog } from '@crm-atlas/types';

export interface WorkflowStats {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  average_duration_ms: number;
  last_execution: string | null;
}

export const workflowsApi = {
  list: async (tenant: string, unit: string): Promise<WorkflowDefinition[]> => {
    const response = await apiClient.get<WorkflowDefinition[]>(`/${tenant}/${unit}/workflows`);
    return response.data;
  },

  get: async (tenant: string, unit: string, workflowId: string): Promise<WorkflowDefinition> => {
    const response = await apiClient.get<WorkflowDefinition>(
      `/${tenant}/${unit}/workflows/${workflowId}`
    );
    return response.data;
  },

  create: async (
    tenant: string,
    unit: string,
    workflow: Omit<WorkflowDefinition, 'workflow_id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<WorkflowDefinition> => {
    const response = await apiClient.post<WorkflowDefinition>(
      `/${tenant}/${unit}/workflows`,
      workflow
    );
    return response.data;
  },

  update: async (
    tenant: string,
    unit: string,
    workflowId: string,
    updates: Partial<Omit<WorkflowDefinition, 'workflow_id' | 'tenant_id' | 'created_at'>>
  ): Promise<WorkflowDefinition> => {
    const response = await apiClient.put<WorkflowDefinition>(
      `/${tenant}/${unit}/workflows/${workflowId}`,
      updates
    );
    return response.data;
  },

  delete: async (tenant: string, unit: string, workflowId: string): Promise<void> => {
    await apiClient.delete(`/${tenant}/${unit}/workflows/${workflowId}`);
  },

  updateStatus: async (
    tenant: string,
    unit: string,
    workflowId: string,
    status: 'active' | 'inactive' | 'draft',
    enabled?: boolean
  ): Promise<WorkflowDefinition> => {
    const response = await apiClient.patch<WorkflowDefinition>(
      `/${tenant}/${unit}/workflows/${workflowId}/status`,
      { status, enabled }
    );
    return response.data;
  },

  trigger: async (
    tenant: string,
    unit: string,
    workflowId: string,
    context?: Record<string, unknown>,
    actor?: string
  ): Promise<{ execution_id: string }> => {
    const response = await apiClient.post<{ execution_id: string }>(
      `/${tenant}/${unit}/workflows/${workflowId}/run`,
      { context, actor }
    );
    return response.data;
  },

  getExecutions: async (
    tenant: string,
    unit: string,
    workflowId: string,
    limit = 100,
    offset = 0
  ): Promise<WorkflowExecutionLog[]> => {
    const response = await apiClient.get<WorkflowExecutionLog[]>(
      `/${tenant}/${unit}/workflows/${workflowId}/executions`,
      {
        params: { limit, offset },
      }
    );
    return response.data;
  },

  getAllExecutions: async (
    tenant: string,
    unit: string,
    limit = 100,
    offset = 0,
    filters?: {
      workflowId?: string;
      status?: string;
      triggerType?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<WorkflowExecutionLog[]> => {
    const response = await apiClient.get<WorkflowExecutionLog[]>(
      `/${tenant}/${unit}/workflows/executions`,
      {
        params: { limit, offset, ...filters },
      }
    );
    return response.data;
  },

  getExecution: async (
    tenant: string,
    unit: string,
    logId: string
  ): Promise<WorkflowExecutionLog> => {
    const response = await apiClient.get<WorkflowExecutionLog>(
      `/${tenant}/${unit}/workflows/executions/${logId}`
    );
    return response.data;
  },

  getStats: async (tenant: string, unit: string, workflowId: string): Promise<WorkflowStats> => {
    const response = await apiClient.get<WorkflowStats>(
      `/${tenant}/${unit}/workflows/${workflowId}/stats`
    );
    return response.data;
  },
};
