import { Controller, Get, Put, Param, Body, UseGuards, Inject, Optional } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import { JwtAuthGuard } from '@crm-atlas/auth';
import { ValidatorCache } from '@crm-atlas/core';
import type {
  UnitConfig,
  EntityDefinition,
  PermissionsConfig,
  DocumentsConfig,
} from '@crm-atlas/types';
import { ConfigService } from './config.service';
import {
  TenantPlaygroundSettingsDto,
  UnitPlaygroundSettingsDto,
} from './dto/playground-settings.dto';

@ApiTags('config')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConfigController {
  private readonly configLoader = new MongoConfigLoader(getDb());

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(ValidatorCache) private readonly validatorCache?: ValidatorCache
  ) {}

  @Get(':tenant/units')
  @ApiOperation({
    summary: 'Get all units for a tenant',
    description: 'Returns list of all units available for the specified tenant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({
    description: 'List of units',
    type: Array<UnitConfig>,
  })
  async getUnits(@Param('tenant') tenant: string): Promise<UnitConfig[]> {
    return this.configLoader.getUnits(tenant);
  }

  @Get(':tenant/config/entities')
  @ApiOperation({
    summary: 'Get all entity definitions for a tenant',
    description:
      'Returns list of all entity definitions (schemas) available for the specified tenant. ' +
      'Entity definitions include field types, validation rules, and relationships. ' +
      'This endpoint aggregates entities from all units of the tenant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({
    description: 'List of entity definitions with their field schemas',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'contact' },
          label: { type: 'string', example: 'Contacts', nullable: true },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'name' },
                label: { type: 'string', example: 'Full Name', nullable: true },
                type: {
                  type: 'string',
                  enum: [
                    'string',
                    'number',
                    'boolean',
                    'date',
                    'email',
                    'url',
                    'text',
                    'json',
                    'reference',
                  ],
                  example: 'string',
                },
                required: { type: 'boolean', example: true },
                indexed: { type: 'boolean', example: true },
                searchable: { type: 'boolean', example: true },
                embeddable: { type: 'boolean', example: false },
                reference_entity: { type: 'string', example: 'company', nullable: true },
                default: { type: 'unknown', nullable: true },
                validation: { type: 'object', nullable: true },
              },
            },
          },
        },
      },
    },
  })
  async getEntities(@Param('tenant') tenant: string): Promise<EntityDefinition[]> {
    // Get entities for all units of the tenant
    const units = await this.configLoader.getUnits(tenant);
    const allEntities: EntityDefinition[] = [];
    const seenNames = new Set<string>();

    for (const unit of units) {
      const entities = await this.configLoader.getEntities({
        tenant_id: tenant,
        unit_id: unit.unit_id,
      });
      for (const entity of entities) {
        if (!seenNames.has(entity.name)) {
          allEntities.push(entity);
          seenNames.add(entity.name);
        }
      }
    }

    return allEntities;
  }

  @Get(':tenant/config/entities/:entityName')
  @ApiOperation({
    summary: 'Get entity definition by name',
    description:
      'Returns the entity definition (schema) for a specific entity type. ' +
      'Useful for getting the schema of a single entity type.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'entityName', description: 'Entity name', example: 'contact' })
  @ApiOkResponse({
    description: 'Entity definition with field schemas',
  })
  async getEntity(
    @Param('tenant') tenant: string,
    @Param('entityName') entityName: string
  ): Promise<EntityDefinition | null> {
    const entities = await this.getEntities(tenant);
    return entities.find((e) => e.name === entityName) || null;
  }

  @Get(':tenant/config/permissions')
  @ApiOperation({
    summary: 'Get permissions configuration',
    description: 'Returns the permissions configuration (roles and scopes) for a tenant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({
    description: 'Permissions configuration',
  })
  async getPermissions(@Param('tenant') tenant: string): Promise<PermissionsConfig | null> {
    return this.configLoader.getPermissions(tenant);
  }

  @Get(':tenant/config/documents')
  @ApiOperation({
    summary: 'Get documents configuration',
    description:
      'Returns the documents configuration (document types and their settings) for a tenant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({
    description: 'Documents configuration with document types',
  })
  async getDocumentsConfig(@Param('tenant') tenant: string): Promise<DocumentsConfig | null> {
    return this.configLoader.getDocumentsConfig(tenant);
  }

  @Get(':tenant/config/clear-cache')
  @ApiOperation({
    summary: 'Clear configuration cache',
    description:
      'Clears the configuration cache and validator cache for a tenant to force reload from database.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({ description: 'Cache cleared successfully' })
  async clearCache(@Param('tenant') tenant: string): Promise<{ message: string }> {
    // Clear config cache for the tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cacheInstance = (this.configLoader as any).cache as {
      clear?: (tenantId?: string) => void;
      clearEntities?: (tenantId?: string) => void;
    };
    if (cacheInstance) {
      if (typeof cacheInstance.clear === 'function') {
        cacheInstance.clear(tenant);
      }
      if (typeof cacheInstance.clearEntities === 'function') {
        cacheInstance.clearEntities(tenant);
      }
    }

    // Clear validator cache
    if (this.validatorCache) {
      this.validatorCache.clear(tenant);
    }

    return {
      message: `Configuration and validator cache cleared for tenant: ${tenant}`,
    };
  }

  @Get(':tenant/config/playground-settings/tenant')
  @ApiOperation({
    summary: 'Get tenant-level playground settings',
    description:
      'Returns tenant-level playground settings (AI Engine configuration and MCP Tools). ' +
      'These settings are shared across all units of the tenant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({
    description: 'Tenant playground settings',
    type: TenantPlaygroundSettingsDto,
  })
  async getTenantPlaygroundSettings(
    @Param('tenant') tenant: string
  ): Promise<TenantPlaygroundSettingsDto> {
    return this.configService.getTenantPlaygroundSettings(tenant);
  }

  @Put(':tenant/config/playground-settings/tenant')
  @ApiOperation({
    summary: 'Update tenant-level playground settings',
    description:
      'Updates tenant-level playground settings (AI Engine configuration and MCP Tools). ' +
      'These settings are shared across all units of the tenant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiBody({ type: TenantPlaygroundSettingsDto })
  @ApiOkResponse({
    description: 'Settings updated successfully',
    type: TenantPlaygroundSettingsDto,
  })
  async updateTenantPlaygroundSettings(
    @Param('tenant') tenant: string,
    @Body() settings: TenantPlaygroundSettingsDto
  ): Promise<TenantPlaygroundSettingsDto> {
    return this.configService.updateTenantPlaygroundSettings(tenant, settings);
  }

  @Get(':tenant/:unit/config/playground-settings/unit')
  @ApiOperation({
    summary: 'Get unit-level playground settings',
    description:
      'Returns unit-level playground settings (Entity Visibility configuration). ' +
      'These settings are specific to each unit.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Unit playground settings',
    type: UnitPlaygroundSettingsDto,
  })
  async getUnitPlaygroundSettings(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<UnitPlaygroundSettingsDto> {
    return this.configService.getUnitPlaygroundSettings(tenant, unit);
  }

  @Put(':tenant/:unit/config/playground-settings/unit')
  @ApiOperation({
    summary: 'Update unit-level playground settings',
    description:
      'Updates unit-level playground settings (Entity Visibility configuration). ' +
      'These settings are specific to each unit.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiBody({ type: UnitPlaygroundSettingsDto })
  @ApiOkResponse({
    description: 'Settings updated successfully',
    type: UnitPlaygroundSettingsDto,
  })
  async updateUnitPlaygroundSettings(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Body() settings: UnitPlaygroundSettingsDto
  ): Promise<UnitPlaygroundSettingsDto> {
    return this.configService.updateUnitPlaygroundSettings(tenant, unit, settings);
  }
}
