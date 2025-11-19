import { apiClient } from './client';
import type { PermissionsConfig, EntityDefinition } from '@crm-atlas/types';

export type { EntityDefinition };

export interface UnitConfig {
  unit_id: string;
  name: string;
  tenant_id: string;
  settings: Record<string, unknown>;
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

  clearCache: async (tenant: string): Promise<{ message: string }> => {
    const response = await apiClient.get<{ message: string }>(`/${tenant}/config/clear-cache`);
    return response.data;
  },

  getDocumentsConfig: async (tenant: string): Promise<any> => {
    try {
      // Direct MongoDB query via API - we'll need to add this endpoint
      // For now, return a default structure
      const response = await apiClient.get(`/${tenant}/config/documents`);
      return response.data;
    } catch (error: any) {
      // If endpoint doesn't exist, return default document types
      if (error.response?.status === 404) {
        return {
          document_types: [
            { name: 'contract', display_name: 'Contract' },
            { name: 'technical_manual', display_name: 'Technical Manual' },
            { name: 'text_document', display_name: 'Text Document' },
          ],
        };
      }
      console.error(`Failed to get documents config for tenant ${tenant}:`, error);
      return null;
    }
  },
};
