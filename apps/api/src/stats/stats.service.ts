import { Injectable } from '@nestjs/common';
import type { TenantContext } from '@crm-atlas/core';
import { getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { collectionName } from '@crm-atlas/utils';

export interface StatsResponse {
  contacts: { total: number; recent: number };
  companies: { total: number; recent: number };
  tasks: { total: number; pending: number };
  opportunities: { total: number; value: number };
  notes: { total: number; recent: number };
}

@Injectable()
export class StatsService {
  private readonly configLoader = new MongoConfigLoader(getDb());

  async getStats(ctx: TenantContext): Promise<StatsResponse> {
    const db = getDb();
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all entity types
    const entities = await this.configLoader.getEntities(ctx);
    const entityNames = entities.map((e) => e.name);

    const stats: StatsResponse = {
      contacts: { total: 0, recent: 0 },
      companies: { total: 0, recent: 0 },
      tasks: { total: 0, pending: 0 },
      opportunities: { total: 0, value: 0 },
      notes: { total: 0, recent: 0 },
    };

    // Count each entity type
    for (const entityName of entityNames) {
      const collName = collectionName(ctx.tenant_id, ctx.unit_id, entityName);
      const collection = db.collection(collName);

      // Total count
      const total = await collection.countDocuments({
        tenant_id: ctx.tenant_id,
        unit_id: ctx.unit_id,
      });

      // Recent count (last 7 days)
      const recent = await collection.countDocuments({
        tenant_id: ctx.tenant_id,
        unit_id: ctx.unit_id,
        created_at: { $gte: last7Days },
      });

      // Update stats based on entity type
      switch (entityName) {
        case 'contact': {
          stats.contacts = { total, recent };
          break;
        }
        case 'company': {
          stats.companies = { total, recent };
          break;
        }
        case 'task': {
          // Count pending tasks (status !== 'completed')
          const pendingTasks = await collection.countDocuments({
            tenant_id: ctx.tenant_id,
            unit_id: ctx.unit_id,
            $or: [{ status: { $ne: 'completed' } }, { status: { $exists: false } }],
          });
          stats.tasks = { total, pending: pendingTasks };
          break;
        }
        case 'opportunity': {
          // Calculate total value
          const opportunities = await collection
            .find({
              tenant_id: ctx.tenant_id,
              unit_id: ctx.unit_id,
            })
            .toArray();
          const totalValue = opportunities.reduce((sum, opp) => {
            const value = typeof opp.value === 'number' ? opp.value : 0;
            return sum + value;
          }, 0);
          stats.opportunities = { total, value: totalValue };
          break;
        }
        case 'note':
          stats.notes = { total, recent };
          break;
      }
    }

    return stats;
  }

  async getRecentNotes(ctx: TenantContext, limit = 10): Promise<unknown[]> {
    const db = getDb();
    const collName = collectionName(ctx.tenant_id, ctx.unit_id, 'note');
    const collection = db.collection(collName);

    const notes = await collection
      .find({
        tenant_id: ctx.tenant_id,
        unit_id: ctx.unit_id,
      })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return notes.map((note) => ({
      ...note,
      _id: note._id.toString(),
    }));
  }
}
