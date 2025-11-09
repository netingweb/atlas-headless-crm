import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import { JwtAuthGuard } from '@crm-atlas/auth';
import type { UnitConfig, EntityDefinition } from '@crm-atlas/types';

@ApiTags('config')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConfigController {
  private readonly configLoader = new MongoConfigLoader(getDb());
  // Access cache property safely
  private get cache(): Map<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.configLoader as any).cache as Map<string, unknown>;
  }

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
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'name' },
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

  @Get(':tenant/config/clear-cache')
  @ApiOperation({
    summary: 'Clear configuration cache',
    description: 'Clears the configuration cache for a tenant to force reload from database.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiOkResponse({ description: 'Cache cleared successfully' })
  async clearCache(@Param('tenant') tenant: string): Promise<{ message: string }> {
    // Clear cache for the tenant
    if (this.cache && typeof this.cache.clear === 'function') {
      this.cache.clear(tenant);
      return { message: `Cache cleared for tenant: ${tenant}` };
    }
    return { message: 'Cache clear requested. Please restart API to fully clear cache.' };
  }
}
