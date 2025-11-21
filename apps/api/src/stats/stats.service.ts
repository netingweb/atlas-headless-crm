import { Injectable } from '@nestjs/common';
import type { TenantContext } from '@crm-atlas/core';
import { getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { collectionName } from '@crm-atlas/utils';
import { ConfigService } from '../config/config.service';
import type { UnitPlaygroundSettingsDto } from '../config/dto/playground-settings.dto';

export interface EntityStats {
  name: string;
  label: string;
  total: number;
  recent: number;
  pending?: number;
  value?: number;
}

export interface StatsResponse {
  entities: EntityStats[];
}

@Injectable()
export class StatsService {
  private readonly configLoader = new MongoConfigLoader(getDb());

  constructor(private readonly configService: ConfigService) {}

  async getStats(ctx: TenantContext): Promise<StatsResponse> {
    const db = getDb();
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all entity types with their definitions
    const entities = await this.configLoader.getEntities(ctx);

    // Get unit playground settings to check entity visibility
    let unitSettings: UnitPlaygroundSettingsDto = {};
    try {
      unitSettings = await this.configService.getUnitPlaygroundSettings(
        ctx.tenant_id,
        ctx.unit_id || ''
      );
    } catch (error) {
      // If unit settings don't exist, continue with defaults (all visible)
    }

    const entityVisibility = unitSettings.entityVisibility || {};
    const entityStats: EntityStats[] = [];

    // Count each entity type
    for (const entity of entities) {
      const entityName = entity.name;
      const entityVisibilityConfig = entityVisibility[entityName];

      // Check if entity is visible in menu (default: true for backward compatibility)
      const isVisible = entityVisibilityConfig?.visibleInMenu ?? true;
      if (!isVisible) {
        continue; // Skip entities not visible in menu
      }

      const isGlobal = entity.scope === 'tenant';

      // Use correct collection name based on entity scope
      const collName = collectionName(
        ctx.tenant_id,
        isGlobal ? null : ctx.unit_id,
        entityName,
        isGlobal
      );
      const collection = db.collection(collName);

      // Build filter based on entity scope
      const baseFilter: Record<string, unknown> = {
        tenant_id: ctx.tenant_id,
      };
      // Only add unit_id filter for local entities
      if (!isGlobal && ctx.unit_id) {
        baseFilter.unit_id = ctx.unit_id;
      }

      // Total count
      const total = await collection.countDocuments(baseFilter);

      // Recent count (last 7 days)
      const recentFilter = {
        ...baseFilter,
        created_at: { $gte: last7Days },
      };
      const recent = await collection.countDocuments(recentFilter);

      // Build entity stats
      const stats: EntityStats = {
        name: entityName,
        label: entity.label || entityName,
        total,
        recent,
      };

      // Add special stats for specific entity types
      if (entityName === 'task') {
        // Count pending tasks (status !== 'completed')
        const pendingFilter = {
          ...baseFilter,
          $or: [{ status: { $ne: 'completed' } }, { status: { $exists: false } }],
        };
        const pending = await collection.countDocuments(pendingFilter);
        stats.pending = pending;
      } else if (entityName === 'opportunity') {
        // Calculate total value
        const opportunities = await collection.find(baseFilter).toArray();
        const totalValue = opportunities.reduce((sum, opp) => {
          const value = typeof opp.value === 'number' ? opp.value : 0;
          return sum + value;
        }, 0);
        stats.value = totalValue;
      }

      entityStats.push(stats);
    }

    return { entities: entityStats };
  }

  async getRecentNotes(ctx: TenantContext, limit = 10): Promise<unknown[]> {
    const db = getDb();
    // Get note entity definition to check if it's global
    const entities = await this.configLoader.getEntities(ctx);
    const noteEntity = entities.find((e) => e.name === 'note');
    const isGlobal = noteEntity?.scope === 'tenant';

    // Use correct collection name based on entity scope
    const collName = collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, 'note', isGlobal);
    const collection = db.collection(collName);

    // Build filter based on entity scope
    const filter: Record<string, unknown> = {
      tenant_id: ctx.tenant_id,
    };
    // Only add unit_id filter for local entities
    if (!isGlobal && ctx.unit_id) {
      filter.unit_id = ctx.unit_id;
    }

    const notes = await collection.find(filter).sort({ created_at: -1 }).limit(limit).toArray();

    return notes.map((note) => ({
      ...note,
      _id: note._id.toString(),
    }));
  }
}
