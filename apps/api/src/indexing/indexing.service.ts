import { Injectable } from '@nestjs/common';
import type { TenantContext } from '@crm-atlas/core';
import { checkTypesenseHealth, getTypesenseMetrics, getCollectionStats } from '@crm-atlas/search';
import { connectMongo } from '@crm-atlas/db';

@Injectable()
export class IndexingService {
  /**
   * Check Typesense health
   */
  async checkHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
    return checkTypesenseHealth();
  }

  /**
   * Get Typesense metrics
   */
  async getMetrics(ctx: TenantContext): Promise<{
    collections: number;
    documents: number;
    collectionStats: Array<{
      name: string;
      numDocuments: number;
      createdAt: number;
      updatedAt: number;
    }>;
  }> {
    const metrics = await getTypesenseMetrics(ctx);
    const collectionStats = await getCollectionStats(ctx);

    return {
      ...metrics,
      collectionStats,
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
}
