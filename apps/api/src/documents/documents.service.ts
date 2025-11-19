import { Injectable, BadRequestException } from '@nestjs/common';
import { NotFoundError } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';
import { EntityRepository } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import { createStorageProvider } from '@crm-atlas/storage';
import type { StorageProvider, StorageConfig } from '@crm-atlas/storage';
import type { DocumentTypeConfig } from '@crm-atlas/types';
import { randomUUID } from 'crypto';
import { deleteQdrantPoint, deleteDocument } from '@crm-atlas/search';
import { logger } from '@crm-atlas/utils';
import { DocumentProcessingWorker } from './documents.worker';

@Injectable()
export class DocumentsService {
  private readonly repository = new EntityRepository();
  private readonly configLoader = new MongoConfigLoader(getDb());
  private storageProviders = new Map<string, StorageProvider>();

  constructor(private readonly worker: DocumentProcessingWorker) {}

  private async getStorageProvider(ctx: TenantContext): Promise<StorageProvider> {
    const cacheKey = `${ctx.tenant_id}`;

    // Always get fresh config to avoid stale cache issues
    const tenantConfig = await this.configLoader.getTenant(ctx.tenant_id);
    if (!tenantConfig?.storage) {
      throw new BadRequestException('Storage not configured for tenant');
    }

    // Check if we need to recreate the provider (config might have changed)
    const existingProvider = this.storageProviders.get(cacheKey);
    if (existingProvider) {
      // For now, always recreate to ensure fresh config
      // In production, you might want to compare config hashes
      this.storageProviders.delete(cacheKey);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = createStorageProvider(tenantConfig.storage as any as StorageConfig);
    this.storageProviders.set(cacheKey, provider);
    return provider;
  }

  private async validateDocumentType(
    tenantId: string,
    documentType: string,
    mimeType: string,
    fileSize: number
  ): Promise<DocumentTypeConfig> {
    const documentsConfig = await this.configLoader.getDocumentsConfig(tenantId);
    if (!documentsConfig) {
      throw new BadRequestException('Documents configuration not found');
    }

    const typeConfig = documentsConfig.document_types.find((dt) => dt.name === documentType);
    if (!typeConfig) {
      throw new BadRequestException(`Document type '${documentType}' not found`);
    }

    // Validate mime type
    const mimeAllowed = typeConfig.allowed_mime_types.some((allowed) => {
      if (allowed.endsWith('/*')) {
        return mimeType.startsWith(allowed.slice(0, -1));
      }
      return allowed === mimeType;
    });

    if (!mimeAllowed) {
      throw new BadRequestException(
        `MIME type '${mimeType}' not allowed for document type '${documentType}'`
      );
    }

    // Validate file size
    if (typeConfig.max_upload_size && fileSize > typeConfig.max_upload_size) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size for document type '${documentType}'`
      );
    }

    return typeConfig;
  }

  async upload(
    ctx: TenantContext,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    metadata: {
      title: string;
      document_type: string;
      related_entity_type?: string;
      related_entity_id?: string;
    }
  ): Promise<unknown> {
    // Validate document type
    await this.validateDocumentType(
      ctx.tenant_id,
      metadata.document_type,
      file.mimetype,
      file.size
    );

    // Generate document ID
    const documentId = randomUUID();

    // Upload to storage
    const storageProvider = await this.getStorageProvider(ctx);
    const storagePath = await storageProvider.upload(
      ctx.tenant_id,
      ctx.unit_id,
      documentId,
      file.originalname,
      file.buffer,
      {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          documentType: metadata.document_type,
        },
      }
    );

    // Create document entity
    const documentData = {
      title: metadata.title,
      mime_type: file.mimetype,
      file_size: file.size,
      storage_path: storagePath,
      document_type: metadata.document_type,
      related_entity_type: metadata.related_entity_type,
      related_entity_id: metadata.related_entity_id,
      processing_status: 'pending',
      filename: file.originalname,
    };

    const created = await this.repository.create(ctx, 'document', documentData);
    const createdId = (created as { _id: string })._id;

    // Queue processing job
    // The worker is initialized in DocumentsModule and injected via DI
    try {
      await this.worker.queueDocumentProcessing(ctx.tenant_id, ctx.unit_id, createdId);
    } catch (error) {
      logger.warn('Failed to queue document processing', {
        error: error instanceof Error ? error.message : String(error),
        documentId: createdId,
      });
      // Don't fail the upload if queue fails - processing can happen later
    }

    return created;
  }

  async findAll(ctx: TenantContext, filters?: Record<string, unknown>): Promise<unknown[]> {
    return this.repository.find(ctx, 'document', filters || {});
  }

  async findById(ctx: TenantContext, id: string): Promise<unknown> {
    const doc = await this.repository.findById(ctx, 'document', id);
    if (!doc) {
      throw new NotFoundError(`Document not found: ${id}`);
    }
    return doc;
  }

  async download(ctx: TenantContext, id: string): Promise<Buffer> {
    const doc = (await this.findById(ctx, id)) as {
      storage_path: string;
      filename?: string;
      mime_type: string;
    };

    const storageProvider = await this.getStorageProvider(ctx);
    const pathParts = doc.storage_path.split('/');
    const documentId = pathParts[pathParts.length - 2];
    const filename = doc.filename || pathParts[pathParts.length - 1];

    return storageProvider.download(ctx.tenant_id, ctx.unit_id, documentId, filename);
  }

  async update(ctx: TenantContext, id: string, data: Record<string, unknown>): Promise<unknown> {
    return this.repository.update(ctx, 'document', id, data);
  }

  async delete(ctx: TenantContext, id: string): Promise<void> {
    const doc = (await this.findById(ctx, id)) as {
      storage_path: string;
      filename?: string;
      document_type?: string;
    };

    // 1. Remove job from queue if pending/processing
    try {
      await this.worker.removeJobFromQueue(ctx.tenant_id, ctx.unit_id, id);
    } catch (error) {
      logger.warn(`Failed to remove job from queue for document ${id}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with deletion even if queue removal fails
    }

    // 2. Delete from vector stores (Qdrant and Typesense)
    try {
      // Delete all chunks from Qdrant (document might have multiple chunks)
      const documentsConfig = await this.configLoader.getDocumentsConfig(ctx.tenant_id);
      const documentTypeConfig = documentsConfig?.document_types.find(
        (dt) => dt.name === doc.document_type
      );

      if (documentTypeConfig?.embedding_config) {
        // Try to delete main document point
        try {
          await deleteQdrantPoint(ctx.tenant_id, 'document', id);
        } catch (error) {
          logger.warn(`Failed to delete Qdrant point ${id}:`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Try to delete chunks (if document was chunked)
        // We don't know how many chunks, so we try a reasonable number
        for (let i = 0; i < 100; i++) {
          try {
            const chunkId = `${id}_chunk_${i}`;
            await deleteQdrantPoint(ctx.tenant_id, 'document', chunkId);
          } catch {
            // Chunk doesn't exist, continue
            break;
          }
        }
      }

      // Delete from Typesense
      try {
        const entityDef = await this.configLoader.getEntity(ctx, 'document');
        await deleteDocument(ctx, 'document', id, entityDef);
      } catch (error) {
        logger.warn(`Failed to delete document ${id} from Typesense:`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      logger.warn(`Error cleaning up vector stores for document ${id}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with deletion even if vector store cleanup fails
    }

    // 3. Delete from storage
    const storageProvider = await this.getStorageProvider(ctx);
    const pathParts = doc.storage_path.split('/');
    const documentId = pathParts[pathParts.length - 2];
    const filename = doc.filename || pathParts[pathParts.length - 1];

    await storageProvider.delete(ctx.tenant_id, ctx.unit_id, documentId, filename);

    // 4. Delete entity from MongoDB
    await this.repository.delete(ctx, 'document', id);
  }

  async getEntityDocuments(
    ctx: TenantContext,
    entityType: string,
    entityId: string
  ): Promise<unknown[]> {
    return this.repository.find(ctx, 'document', {
      related_entity_type: entityType,
      related_entity_id: entityId,
    });
  }
}
