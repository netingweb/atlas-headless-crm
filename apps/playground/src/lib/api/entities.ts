import { apiClient } from './client';

export interface Entity {
  _id: string;
  tenant_id: string;
  unit_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface EntityListParams {
  tenant: string;
  unit: string;
  entity: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const entitiesApi = {
  list: async (params: EntityListParams): Promise<Entity[]> => {
    const { tenant, unit, entity, ...queryParams } = params;
    const response = await apiClient.get<Entity[]>(`/${tenant}/${unit}/${entity}`, {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (
    tenant: string,
    unit: string,
    entity: string,
    id: string,
    populate = false
  ): Promise<Entity> => {
    const response = await apiClient.get<Entity>(`/${tenant}/${unit}/${entity}/${id}`, {
      params: { populate },
    });
    return response.data;
  },

  create: async (
    tenant: string,
    unit: string,
    entity: string,
    data: Record<string, unknown>
  ): Promise<Entity> => {
    const response = await apiClient.post<Entity>(`/${tenant}/${unit}/${entity}`, data);
    return response.data;
  },

  update: async (
    tenant: string,
    unit: string,
    entity: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<Entity> => {
    console.log('[Client API] Update request:', {
      tenant,
      unit,
      entity,
      id,
      dataKeys: Object.keys(data),
      data,
    });
    // Debug: log service_type specifically if present
    if (entity === 'service_order' && 'service_type' in data) {
      console.log('[Client API] service_type value:', data.service_type);
      console.log(
        '[Client API] service_type type:',
        typeof data.service_type,
        Array.isArray(data.service_type)
      );
      console.log('[Client API] service_type JSON:', JSON.stringify(data.service_type));
    }

    try {
      const response = await apiClient.put<Entity>(`/${tenant}/${unit}/${entity}/${id}`, data);
      console.log('[Client API] Update response:', {
        status: response.status,
        dataKeys: response.data ? Object.keys(response.data) : [],
      });
      return response.data;
    } catch (error: any) {
      console.error('[Client API] Update error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },

  delete: async (tenant: string, unit: string, entity: string, id: string): Promise<void> => {
    await apiClient.delete(`/${tenant}/${unit}/${entity}/${id}`);
  },

  getRelated: async (
    tenant: string,
    unit: string,
    entity: string,
    id: string,
    relatedEntity: string
  ): Promise<Entity[]> => {
    const response = await apiClient.get<Entity[]>(
      `/${tenant}/${unit}/${entity}/${id}/${relatedEntity}`
    );
    return response.data;
  },
};
