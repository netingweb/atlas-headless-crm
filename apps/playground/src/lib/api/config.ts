import { apiClient } from './client';
import type { PermissionsConfig } from '@crm-atlas/types';

export interface UnitConfig {
  unit_id: string;
  name: string;
  tenant_id: string;
  settings: Record<string, unknown>;
}

export interface EntityDefinition {
  name: string;
  fields: Array<{
    name: string;
    type:
      | 'string'
      | 'number'
      | 'boolean'
      | 'date'
      | 'email'
      | 'url'
      | 'text'
      | 'json'
      | 'reference';
    required: boolean;
    indexed: boolean;
    searchable: boolean;
    embeddable: boolean;
    reference_entity?: string;
    default?: unknown;
    validation?: Record<string, unknown>;
  }>;
  indexes?: Array<Record<string, unknown>>;
}

export const configApi = {
  getUnits: async (tenant: string): Promise<UnitConfig[]> => {
    const response = await apiClient.get<UnitConfig[]>(`/${tenant}/units`);
    return response.data;
  },

  getEntities: async (tenant: string): Promise<EntityDefinition[]> => {
    const response = await apiClient.get<EntityDefinition[]>(`/${tenant}/config/entities`);
    return response.data;
  },

  getEntity: async (tenant: string, entityName: string): Promise<EntityDefinition | null> => {
    try {
      // Try direct endpoint first
      try {
        const response = await apiClient.get<EntityDefinition>(
          `/${tenant}/config/entities/${entityName}`
        );
        if (response.data) {
          return response.data;
        }
      } catch (directError: any) {
        // If direct endpoint fails (404), fallback to list and find
        if (directError.response?.status !== 404) {
          console.warn('Direct entity endpoint failed, using fallback:', directError);
        }
      }

      // Fallback: get all entities and find
      const entities = await configApi.getEntities(tenant);
      const entity = entities.find((e) => e.name === entityName) || null;
      if (!entity) {
        console.warn(
          `Entity definition not found: ${entityName}. Available entities:`,
          entities.map((e) => e.name)
        );
      }
      return entity;
    } catch (error) {
      console.error(`Failed to get entity definition for ${entityName}:`, error);
      throw error;
    }
  },

  getPermissions: async (tenant: string): Promise<PermissionsConfig | null> => {
    try {
      const response = await apiClient.get<PermissionsConfig>(`/${tenant}/config/permissions`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get permissions for tenant ${tenant}:`, error);
      return null;
    }
  },
};
