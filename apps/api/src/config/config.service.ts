import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import type {
  TenantPlaygroundSettingsDto,
  UnitPlaygroundSettingsDto,
  AIConfigDto,
} from './dto/playground-settings.dto';

@Injectable()
export class ConfigService {
  private readonly configLoader = new MongoConfigLoader(getDb());
  private readonly db = getDb();

  /**
   * Get tenant-level playground settings (AI, MCP Tools)
   */
  async getTenantPlaygroundSettings(tenantId: string): Promise<TenantPlaygroundSettingsDto> {
    const tenantConfig = await this.configLoader.getTenant(tenantId);
    if (!tenantConfig) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const settings = (tenantConfig.settings as Record<string, unknown>) || {};
    const basePlayground =
      (settings.playground as TenantPlaygroundSettingsDto | undefined) ||
      ({} as TenantPlaygroundSettingsDto);
    const playgroundSettings: TenantPlaygroundSettingsDto = {
      ...basePlayground,
    };

    if (
      !playgroundSettings.ai &&
      tenantConfig.embeddingsProvider &&
      tenantConfig.embeddingsProvider.name === 'openai'
    ) {
      playgroundSettings.ai = {
        provider: 'openai',
        apiKey: tenantConfig.embeddingsProvider.apiKey || '',
        model: tenantConfig.embeddingsProvider.model || 'text-embedding-3-small',
      };
    }

    return playgroundSettings;
  }

  /**
   * Update tenant-level playground settings (AI, MCP Tools)
   */
  async updateTenantPlaygroundSettings(
    tenantId: string,
    settings: TenantPlaygroundSettingsDto
  ): Promise<TenantPlaygroundSettingsDto> {
    const tenantConfig = await this.configLoader.getTenant(tenantId);
    if (!tenantConfig) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const currentSettings = (tenantConfig.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      playground: {
        ...((currentSettings.playground as Record<string, unknown>) || {}),
        ...settings,
      },
    };

    const updateDoc: Record<string, unknown> = {
      settings: updatedSettings,
    };

    if (settings.ai) {
      const embeddingsProvider = this.mapAIConfigToEmbeddings(settings.ai);
      if (embeddingsProvider) {
        updateDoc.embeddingsProvider = embeddingsProvider;
      }
    }

    await this.db
      .collection('tenant_config')
      .updateOne({ tenant_id: tenantId }, { $set: updateDoc });

    // Clear cache to ensure fresh data on next read
    this.configLoader.clearCache(tenantId);

    return settings;
  }

  /**
   * Get unit-level playground settings (Entity Visibility)
   */
  async getUnitPlaygroundSettings(
    tenantId: string,
    unitId: string
  ): Promise<UnitPlaygroundSettingsDto> {
    const unitConfig = await this.configLoader.getUnit(tenantId, unitId);
    if (!unitConfig) {
      throw new NotFoundException(`Unit ${unitId} not found for tenant ${tenantId}`);
    }

    const settings = (unitConfig.settings as Record<string, unknown>) || {};
    return (settings.playground as UnitPlaygroundSettingsDto) || {};
  }

  /**
   * Update unit-level playground settings (Entity Visibility)
   */
  async updateUnitPlaygroundSettings(
    tenantId: string,
    unitId: string,
    settings: UnitPlaygroundSettingsDto
  ): Promise<UnitPlaygroundSettingsDto> {
    const unitConfig = await this.configLoader.getUnit(tenantId, unitId);
    if (!unitConfig) {
      throw new NotFoundException(`Unit ${unitId} not found for tenant ${tenantId}`);
    }

    const currentSettings = (unitConfig.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      playground: {
        ...((currentSettings.playground as Record<string, unknown>) || {}),
        ...settings,
      },
    };

    await this.db
      .collection('units_config')
      .updateOne({ tenant_id: tenantId, unit_id: unitId }, { $set: { settings: updatedSettings } });

    // Clear cache to ensure fresh data on next read
    this.configLoader.clearCache(tenantId);

    return settings;
  }

  private mapAIConfigToEmbeddings(
    aiConfig: AIConfigDto
  ): { name: 'openai'; apiKey?: string; model?: string } | null {
    if (aiConfig.provider !== 'openai') {
      return null;
    }

    return {
      name: 'openai',
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    };
  }
}
