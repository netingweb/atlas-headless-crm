import { apiClient } from './client';

export interface AIConfig {
  provider: 'openai' | 'azure';
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MCPToolsConfig {
  disabledTools?: string[];
}

export interface TenantPlaygroundSettings {
  ai?: AIConfig;
  mcpTools?: MCPToolsConfig;
}

export interface FieldVisibility {
  visibleInList: boolean;
  visibleInDetail: boolean;
  visibleInReference?: boolean;
}

export interface EntityVisibility {
  visibleInMenu: boolean;
  fields: Record<string, FieldVisibility>;
}

export interface UnitPlaygroundSettings {
  entityVisibility?: Record<string, EntityVisibility>;
}

export const playgroundSettingsApi = {
  // Tenant-level settings (shared across all units)
  getTenantSettings: async (tenantId: string): Promise<TenantPlaygroundSettings> => {
    const response = await apiClient.get<TenantPlaygroundSettings>(
      `/${tenantId}/config/playground-settings/tenant`
    );
    return response.data || {};
  },

  updateTenantSettings: async (
    tenantId: string,
    settings: TenantPlaygroundSettings
  ): Promise<TenantPlaygroundSettings> => {
    const response = await apiClient.put<TenantPlaygroundSettings>(
      `/${tenantId}/config/playground-settings/tenant`,
      settings
    );
    return response.data;
  },

  // Unit-level settings (specific to each unit)
  getUnitSettings: async (tenantId: string, unitId: string): Promise<UnitPlaygroundSettings> => {
    const response = await apiClient.get<UnitPlaygroundSettings>(
      `/${tenantId}/${unitId}/config/playground-settings/unit`
    );
    return response.data || {};
  },

  updateUnitSettings: async (
    tenantId: string,
    unitId: string,
    settings: UnitPlaygroundSettings
  ): Promise<UnitPlaygroundSettings> => {
    const response = await apiClient.put<UnitPlaygroundSettings>(
      `/${tenantId}/${unitId}/config/playground-settings/unit`,
      settings
    );
    return response.data;
  },
};
