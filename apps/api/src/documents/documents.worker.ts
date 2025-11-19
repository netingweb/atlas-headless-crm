import { Injectable } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb, EntityRepository } from '@crm-atlas/db';
import { createStorageProvider } from '@crm-atlas/storage';
import { processDocument } from '@crm-atlas/documents';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import {
  upsertQdrantPoint,
  ensureQdrantCollection,
  upsertDocument,
  ensureCollection,
} from '@crm-atlas/search';
import type { TenantContext } from '@crm-atlas/core';
import { logger } from '@crm-atlas/utils';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

@Injectable()
export class DocumentProcessingWorker {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private configLoader = new MongoConfigLoader(getDb());
  private repository = new EntityRepository();

  /**
   * Get queue for a specific tenant/unit
   */
  getQueue(tenantId: string, unitId: string): Queue | null {
    const queueName = `document_processing_${tenantId}_${unitId}`;
    return this.queues.get(queueName) || null;
  }

  /**
   * Remove a job from the queue by document ID
   */
  async removeJobFromQueue(tenantId: string, unitId: string, documentId: string): Promise<void> {
    const queue = this.getQueue(tenantId, unitId);
    if (!queue) {
      // Queue doesn't exist, try to create it first (it might not be initialized yet)
      this.setupQueue(tenantId, unitId);
      const newQueue = this.getQueue(tenantId, unitId);
      if (!newQueue) {
        return; // Still doesn't exist, nothing to remove
      }
    }

    const finalQueue = queue || this.getQueue(tenantId, unitId)!;

    // Try to remove by job ID first (faster)
    try {
      const jobId = `doc_${documentId}`;
      const job = await finalQueue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Removed job ${jobId} for document ${documentId} from queue`);
        return;
      }
    } catch {
      // Job doesn't exist with that ID, continue with search
    }

    // Fallback: Get all jobs in all states and find the one matching the document ID
    const allStates: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = [
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ];

    for (const state of allStates) {
      try {
        const jobs = await finalQueue.getJobs([state]);
        for (const job of jobs) {
          if (job.data?.documentId === documentId) {
            await job.remove();
            logger.info(`Removed ${state} job ${job.id} for document ${documentId} from queue`);
          }
        }
      } catch (error) {
        logger.warn(`Failed to get ${state} jobs for cleanup`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Clean old completed and failed jobs from the queue
   */
  async cleanOldJobs(
    tenantId: string,
    unitId: string,
    grace: number = 24 * 60 * 60 * 1000 // Default: 24 hours
  ): Promise<{ completed: number; failed: number }> {
    const queue = this.getQueue(tenantId, unitId);
    if (!queue) {
      return { completed: 0, failed: 0 };
    }

    const now = Date.now();
    let completedRemoved = 0;
    let failedRemoved = 0;

    // Clean completed jobs older than grace period
    try {
      const completedJobs = await queue.getJobs(['completed'], 0, -1);
      for (const job of completedJobs) {
        if (job.finishedOn && now - job.finishedOn > grace) {
          await job.remove();
          completedRemoved++;
        }
      }
    } catch (error) {
      logger.warn('Failed to clean completed jobs', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Clean failed jobs older than grace period
    try {
      const failedJobs = await queue.getJobs(['failed'], 0, -1);
      for (const job of failedJobs) {
        if (job.finishedOn && now - job.finishedOn > grace) {
          await job.remove();
          failedRemoved++;
        }
      }
    } catch (error) {
      logger.warn('Failed to clean failed jobs', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info(
      `Cleaned ${completedRemoved} completed and ${failedRemoved} failed jobs from queue`
    );
    return { completed: completedRemoved, failed: failedRemoved };
  }

  /**
   * Clean all completed and failed jobs (for testing/debugging)
   */
  async cleanAllCompletedAndFailed(
    tenantId: string,
    unitId: string
  ): Promise<{ completed: number; failed: number }> {
    return this.cleanOldJobs(tenantId, unitId, 0); // Grace period of 0 = remove all
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(
    tenantId: string,
    unitId: string
  ): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(tenantId, unitId);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get jobs for a specific document
   */
  async getJobsForDocument(tenantId: string, unitId: string, documentId: string): Promise<Job[]> {
    const queue = this.getQueue(tenantId, unitId);
    if (!queue) {
      return [];
    }

    const allJobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed']);
    return allJobs.filter((job) => job.data?.documentId === documentId);
  }

  /**
   * Get failed jobs with error details
   */
  async getFailedJobs(tenantId: string, unitId: string, limit: number = 50): Promise<Job[]> {
    const queue = this.getQueue(tenantId, unitId);
    if (!queue) {
      return [];
    }

    return queue.getJobs(['failed'], 0, limit - 1);
  }

  /**
   * Get all jobs (for monitoring)
   */
  async getAllJobs(
    tenantId: string,
    unitId: string,
    states: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = [
      'waiting',
      'active',
      'failed',
    ],
    limit: number = 100
  ): Promise<Job[]> {
    const queue = this.getQueue(tenantId, unitId);
    if (!queue) {
      return [];
    }

    const allJobs: Job[] = [];
    for (const state of states) {
      const jobs = await queue.getJobs([state], 0, limit - 1);
      allJobs.push(...jobs);
    }
    return allJobs.slice(0, limit);
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Document Processing Worker...');

      const tenants = await this.configLoader.getTenants();
      if (!tenants || tenants.length === 0) {
        logger.warn('No tenants found, worker will start queues on-demand');
        return;
      }

      for (const tenant of tenants) {
        try {
          const units = await this.configLoader.getUnits(tenant.tenant_id);
          if (!units || units.length === 0) {
            logger.warn(`No units found for tenant ${tenant.tenant_id}`);
            continue;
          }
          for (const unit of units) {
            try {
              this.setupQueue(tenant.tenant_id, unit.unit_id);
            } catch (error) {
              logger.error(
                `Failed to setup queue for ${tenant.tenant_id}/${unit.unit_id}:`,
                error instanceof Error ? error : new Error(String(error))
              );
            }
          }
        } catch (error) {
          logger.error(
            `Failed to get units for tenant ${tenant.tenant_id}:`,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }

      logger.info('Document Processing Worker started');
    } catch (error) {
      logger.error(
        'Failed to start Document Processing Worker:',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  private setupQueue(tenantId: string, unitId: string): void {
    const queueName = `document_processing_${tenantId}_${unitId}`;

    if (this.queues.has(queueName)) {
      return;
    }

    const queue = new Queue(queueName, { connection: redis });

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        await this.processDocumentJob(tenantId, unitId, job);
      },
      { connection: redis }
    );

    worker.on('completed', (job: Job) => {
      logger.info(`Document processing completed`, {
        jobId: job.id,
        documentId: job.data?.documentId,
      });
    });

    worker.on('failed', async (job: Job | undefined, err: Error) => {
      const documentId = job?.data?.documentId;
      logger.error(`Document processing failed`, err, { jobId: job?.id, documentId });

      // Update document status to failed
      if (documentId) {
        try {
          const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };
          const existingDoc = await this.repository.findById(ctx, 'document', documentId);
          const existingMetadata =
            (existingDoc as { metadata?: Record<string, unknown> })?.metadata || {};
          await this.repository.update(ctx, 'document', documentId, {
            processing_status: 'failed',
            metadata: {
              ...existingMetadata,
              error: err.message,
              error_stack: err.stack,
              failed_at: new Date().toISOString(),
            },
          });
        } catch (updateError) {
          logger.error(
            `Failed to update document status to failed`,
            updateError instanceof Error ? updateError : new Error(String(updateError))
          );
        }
      }
    });

    this.queues.set(queueName, queue);
    this.workers.set(queueName, worker);

    logger.info(`Document processing queue created: ${queueName}`);
  }

  async queueDocumentProcessing(
    tenantId: string,
    unitId: string,
    documentId: string
  ): Promise<void> {
    const queueName = `document_processing_${tenantId}_${unitId}`;
    let queue = this.queues.get(queueName);

    if (!queue) {
      this.setupQueue(tenantId, unitId);
      queue = this.queues.get(queueName)!;
    }

    await queue.add(
      'process-document',
      { documentId, tenantId, unitId },
      {
        jobId: `doc_${documentId}`, // Use document ID as job ID for easier removal
      }
    );
  }

  private async processDocumentJob(tenantId: string, unitId: string, job: Job): Promise<void> {
    const { documentId } = job.data;
    const ctx: TenantContext = { tenant_id: tenantId, unit_id: unitId };

    try {
      // Update status to processing
      await this.repository.update(ctx, 'document', documentId, {
        processing_status: 'processing',
      });

      // Get document
      const docRaw = await this.repository.findById(ctx, 'document', documentId);
      if (!docRaw) {
        throw new Error(`Document not found: ${documentId}`);
      }
      const doc = docRaw as unknown as {
        storage_path: string;
        filename?: string;
        mime_type: string;
        document_type: string;
      };

      // Get storage provider and download file
      const tenantConfig = await this.configLoader.getTenant(tenantId);
      if (!tenantConfig?.storage) {
        throw new Error('Storage not configured');
      }

      const storageProvider = createStorageProvider(tenantConfig.storage as any);
      const pathParts = doc.storage_path.split('/');
      const docId = pathParts[pathParts.length - 2];
      const filename = doc.filename || pathParts[pathParts.length - 1];

      const fileBuffer = await storageProvider.download(tenantId, unitId, docId, filename);

      // Get document type config
      const documentsConfig = await this.configLoader.getDocumentsConfig(tenantId);
      const documentTypeConfig = documentsConfig?.document_types.find(
        (dt) => dt.name === doc.document_type
      );

      // Process document
      const chunkingOptions = documentTypeConfig?.embedding_config
        ? {
            chunkSize: documentTypeConfig.embedding_config.chunk_size || 1000,
            chunkOverlap: documentTypeConfig.embedding_config.chunk_overlap || 200,
          }
        : tenantConfig.documentProcessing?.chunkingDefaults
          ? {
              chunkSize: tenantConfig.documentProcessing.chunkingDefaults.chunkSize,
              chunkOverlap: tenantConfig.documentProcessing.chunkingDefaults.chunkOverlap,
            }
          : undefined;

      const processingResult = await processDocument(fileBuffer, doc.mime_type, {
        documentType: documentTypeConfig,
        chunkingOptions,
        enableVision: documentTypeConfig?.vision_enabled || false,
        enableOCR: documentTypeConfig?.ocr_enabled || false,
        visionProvider: tenantConfig.visionProvider,
      });

      // Update document with extracted content
      await this.repository.update(ctx, 'document', documentId, {
        extracted_content: processingResult.text,
        metadata: processingResult.metadata,
        processing_status: 'completed',
      });

      // Generate embeddings and index
      if (processingResult.text && documentTypeConfig?.embedding_config) {
        const embeddingConfig = documentTypeConfig.embedding_config;
        const globalConfig = getProviderConfig();
        const provider = createEmbeddingsProvider(globalConfig, {
          name: embeddingConfig.model,
          model: embeddingConfig.model_name,
        });

        // Process chunks or full text
        const textsToEmbed = processingResult.chunks
          ? processingResult.chunks.map((chunk: { text: string }) => chunk.text)
          : [processingResult.text];

        const vectors = await provider.embedTexts(textsToEmbed);

        // Index in Qdrant
        if (vectors.length > 0) {
          await ensureQdrantCollection(tenantId, 'document', vectors[0].length);

          for (let i = 0; i < vectors.length; i++) {
            const chunkId = processingResult.chunks ? `${documentId}_chunk_${i}` : documentId;
            await upsertQdrantPoint(tenantId, 'document', {
              id: chunkId,
              vector: vectors[i],
              payload: {
                tenant_id: tenantId,
                unit_id: unitId,
                document_id: documentId,
                chunk_index: i,
                text: textsToEmbed[i],
              },
            });
          }
        }
      }

      // Index in Typesense - ensure collection exists first
      const entitiesConfig = await this.configLoader.getEntities(ctx);
      const documentEntityDef = entitiesConfig?.find((e) => e.name === 'document');
      if (documentEntityDef) {
        await ensureCollection(ctx, 'document', documentEntityDef);
      }

      const updatedDoc = await this.repository.findById(ctx, 'document', documentId);
      await upsertDocument(ctx, 'document', {
        id: documentId,
        ...(updatedDoc as unknown as Record<string, unknown>),
        tenant_id: tenantId,
        unit_id: unitId,
      });

      logger.info(`Document processed successfully: ${documentId}`);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(`Error processing document ${documentId}`, errorObj, {
        message: errorObj.message,
        stack: errorObj.stack,
      });

      // Update document status with detailed error info
      try {
        const existingDoc = await this.repository.findById(ctx, 'document', documentId);
        const existingMetadata =
          (existingDoc as { metadata?: Record<string, unknown> })?.metadata || {};
        await this.repository.update(ctx, 'document', documentId, {
          processing_status: 'failed',
          metadata: {
            ...existingMetadata,
            error: errorObj.message,
            error_stack: errorObj.stack,
            failed_at: new Date().toISOString(),
          },
        });
      } catch (updateError) {
        logger.error(
          `Failed to update document status to failed`,
          updateError instanceof Error ? updateError : new Error(String(updateError))
        );
      }

      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping Document Processing Worker...');
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
    this.workers.clear();
    logger.info('Document Processing Worker stopped');
  }
}
