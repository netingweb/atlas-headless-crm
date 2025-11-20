import { Injectable } from '@nestjs/common';
import type { TenantContext } from '@crm-atlas/core';
import {
  checkTypesenseHealth,
  getTypesenseMetrics,
  type TypesenseMetrics,
} from '@crm-atlas/search';
import { connectMongo, getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { collectionName } from '@crm-atlas/utils';
import type { EntityDefinition } from '@crm-atlas/types';

type CollectionScope = 'global' | 'local' | 'unknown';

export interface IndexedCollectionDetail {
  name: string;
  entity: string | null;
  scope: CollectionScope;
  unit_id?: string | null;
  indexed: boolean;
  numDocuments: number;
  createdAt: number | null;
  updatedAt: number | null;
}

export interface IndexingMetricsResponse {
  summary: {
    totalCollections: number;
    totalDocuments: number;
    global: {
      expected: number;
      indexed: number;
      documents: number;
    };
    local: {
      expected: number;
      indexed: number;
      documents: number;
    };
    unknown: {
      indexed: number;
      documents: number;
    };
  };
  globalCollections: IndexedCollectionDetail[];
  localCollections: IndexedCollectionDetail[];
  unknownCollections: IndexedCollectionDetail[];
  raw: TypesenseMetrics;
}

@Injectable()
export class IndexingService {
  private readonly configLoader = new MongoConfigLoader(getDb());

  /**
   * Check Typesense health
   */
  async checkHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
    return checkTypesenseHealth();
  }

  /**
   * Get Typesense metrics
   */
  async getMetrics(ctx: TenantContext): Promise<IndexingMetricsResponse> {
    const [metrics, entities, units] = await Promise.all([
      getTypesenseMetrics(ctx),
      this.configLoader.getEntities(ctx),
      this.configLoader.getUnits(ctx.tenant_id),
    ]);

    const statsMap = new Map((metrics.collectionStats || []).map((stat) => [stat.name, stat]));

    const globalEntities = entities.filter((entity) => entity.scope === 'tenant');
    const localEntities = entities.filter((entity) => entity.scope !== 'tenant');

    const globalCollections = this.buildCollectionDetails(
      ctx.tenant_id,
      null,
      globalEntities,
      statsMap,
      'global'
    );

    const localCollections: IndexedCollectionDetail[] = [];
    for (const unit of units) {
      localCollections.push(
        ...this.buildCollectionDetails(
          ctx.tenant_id,
          unit.unit_id,
          localEntities,
          statsMap,
          'local'
        )
      );
    }

    const unknownCollections: IndexedCollectionDetail[] = Array.from(statsMap.values()).map(
      (stat) => ({
        name: stat.name,
        entity: null,
        scope: 'unknown' as const,
        unit_id: null,
        indexed: true,
        numDocuments: stat.numDocuments,
        createdAt: stat.createdAt ?? null,
        updatedAt: stat.updatedAt ?? null,
      })
    );

    const summary = {
      totalCollections: metrics.collections,
      totalDocuments: metrics.documents,
      global: {
        expected: globalCollections.length,
        indexed: this.countIndexed(globalCollections),
        documents: this.sumDocuments(globalCollections),
      },
      local: {
        expected: localCollections.length,
        indexed: this.countIndexed(localCollections),
        documents: this.sumDocuments(localCollections),
      },
      unknown: {
        indexed: unknownCollections.length,
        documents: this.sumDocuments(unknownCollections),
      },
    };

    return {
      summary,
      globalCollections,
      localCollections,
      unknownCollections,
      raw: metrics,
    };
  }

  /**
   * Trigger backfill indexing
   */
  async triggerBackfill(): Promise<{ success: boolean; message: string }> {
    try {
      // Ensure MongoDB connection
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
      const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

      await connectMongo(mongoUri, dbName);

      // Import and run backfill dynamically to avoid circular dependencies
      // Use absolute path from project root
      const backfillModule = await import('../../../indexer/src/backfill');
      await backfillModule.backfillIndexes();

      return {
        success: true,
        message: 'Backfill completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildCollectionDetails(
    tenantId: string,
    unitId: string | null,
    entityDefs: EntityDefinition[],
    statsMap: Map<
      string,
      {
        name: string;
        numDocuments: number;
        createdAt: number;
        updatedAt: number;
      }
    >,
    scope: CollectionScope
  ): IndexedCollectionDetail[] {
    return entityDefs.map((entity) => {
      const name = collectionName(tenantId, unitId, entity.name, scope === 'global');
      const stat = statsMap.get(name);
      if (stat) {
        statsMap.delete(name);
      }
      return {
        name,
        entity: entity.name,
        scope,
        unit_id: unitId,
        indexed: Boolean(stat),
        numDocuments: stat?.numDocuments ?? 0,
        createdAt: stat?.createdAt ?? null,
        updatedAt: stat?.updatedAt ?? null,
      };
    });
  }

  private sumDocuments(collections: IndexedCollectionDetail[]): number {
    return collections.reduce((acc, item) => acc + (item.numDocuments || 0), 0);
  }

  private countIndexed(collections: IndexedCollectionDetail[]): number {
    return collections.filter((item) => item.indexed).length;
  }
}
