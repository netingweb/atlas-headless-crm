import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';
import { ValidatorCache } from '@crm-atlas/core';
import { EntityRepository } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import type { EntityDefinition } from '@crm-atlas/types';
import { RelationsService } from './relations.service';
import {
  upsertQdrantPoint,
  ensureQdrantCollection,
  upsertDocument,
  deleteDocument,
  deleteQdrantPoint,
} from '@crm-atlas/search';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import { getEmbeddableFields, concatFields } from '@crm-atlas/utils';
import { EntityEvents } from './entities.events';

@Injectable()
export class EntitiesService {
  private readonly repository = new EntityRepository();
  private readonly configLoader = new MongoConfigLoader(getDb());
  private readonly validatorCache = new ValidatorCache();
  private readonly relationsService = new RelationsService();
  private readonly events: EntityEvents | null = null; // Will be injected if EventEmitter2 is available

  async create(
    ctx: TenantContext,
    entity: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const entityDef = await this.configLoader.getEntity(ctx, entity);
    if (!entityDef) {
      throw new NotFoundError(`Entity ${entity} not found`);
    }

    // Clear cache to ensure latest schema is used
    this.validatorCache.clear(ctx.tenant_id);
    const validator = this.validatorCache.getOrCompile(ctx.tenant_id, entity, entityDef);
    const valid = validator(data);

    if (!valid) {
      const errors =
        validator.errors?.map((err) => {
          const path =
            err.instancePath || err.params?.missingProperty || err.params?.property || 'unknown';
          const message = err.message || 'Validation failed';
          return {
            path,
            message,
            params: err.params,
          };
        }) || [];
      const errorMessages = errors.map((e) => `${e.path}: ${e.message}`).join(', ');
      throw new ValidationError(`Validation failed: ${errorMessages}`, errors);
    }

    // Validate referenced entities exist
    await this.relationsService.validateReferences(ctx, entityDef, data);

    const created = await this.repository.create(ctx, entity, data);
    const createdId = (created as { _id: string })._id;

    // Index in Typesense and Qdrant
    await this.indexEntity(ctx, entity, entityDef, created as unknown as Record<string, unknown>);

    // Emit event for workflow engine (if available)
    if (this.events) {
      this.events.emitEntityCreated(ctx.tenant_id, ctx.unit_id, entity, createdId, data);
    }

    return created;
  }

  async findById(
    ctx: TenantContext,
    entity: string,
    id: string,
    populate = false
  ): Promise<unknown> {
    const entityDef = await this.ensureEntityExists(ctx, entity);
    const doc = await this.repository.findById(ctx, entity, id);
    if (!doc) {
      throw new NotFoundError(`Resource not found: ${entity}/${id}`);
    }

    if (populate) {
      return this.relationsService.populateReferences(
        ctx,
        entityDef,
        doc as unknown as Record<string, unknown>
      );
    }

    return doc;
  }

  async update(
    ctx: TenantContext,
    entity: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const entityDef = await this.ensureEntityExists(ctx, entity);
    // Clear cache to ensure latest schema is used
    this.validatorCache.clear(ctx.tenant_id);
    const validator = this.validatorCache.getOrCompile(ctx.tenant_id, entity, entityDef);
    const valid = validator(data);

    if (!valid) {
      const errors =
        validator.errors?.map((err) => {
          const path =
            err.instancePath || err.params?.missingProperty || err.params?.property || 'unknown';
          const message = err.message || 'Validation failed';
          return {
            path,
            message,
            params: err.params,
          };
        }) || [];
      const errorMessages = errors.map((e) => `${e.path}: ${e.message}`).join(', ');
      throw new ValidationError(`Validation failed: ${errorMessages}`, errors);
    }

    // Validate referenced entities exist
    await this.relationsService.validateReferences(ctx, entityDef, data);

    const updated = await this.repository.update(ctx, entity, id, data);
    if (!updated) {
      throw new NotFoundError(`Resource not found: ${entity}/${id}`);
    }

    // Re-index in Typesense and Qdrant
    await this.indexEntity(ctx, entity, entityDef, updated as unknown as Record<string, unknown>);

    // Emit event for workflow engine (if available)
    if (this.events) {
      this.events.emitEntityUpdated(ctx.tenant_id, ctx.unit_id, entity, id, data);
    }

    return updated;
  }

  async delete(ctx: TenantContext, entity: string, id: string): Promise<void> {
    const entityDef = await this.ensureEntityExists(ctx, entity);
    const deleted = await this.repository.delete(ctx, entity, id);
    if (!deleted) {
      throw new NotFoundError(`Resource not found: ${entity}/${id}`);
    }

    // Remove from search indexes
    await this.removeFromIndexes(ctx, entity, id, entityDef);

    // Emit event for workflow engine (if available)
    if (this.events) {
      this.events.emitEntityDeleted(ctx.tenant_id, ctx.unit_id, entity, id);
    }
  }

  async findAll(ctx: TenantContext, entity: string): Promise<unknown[]> {
    await this.ensureEntityExists(ctx, entity);
    return this.repository.find(ctx, entity);
  }

  private async ensureEntityExists(ctx: TenantContext, entity: string): Promise<EntityDefinition> {
    const entityDef = await this.configLoader.getEntity(ctx, entity);
    if (!entityDef) {
      throw new NotFoundError(`Entity ${entity} not found`);
    }
    return entityDef;
  }

  /**
   * Index entity in Typesense and Qdrant (for embeddable fields)
   */
  private async indexEntity(
    ctx: TenantContext,
    entity: string,
    entityDef: EntityDefinition,
    doc: Record<string, unknown>
  ): Promise<void> {
    try {
      // Index in Typesense for full-text search
      const { ensureCollection } = await import('@crm-atlas/search');
      await ensureCollection(ctx, entity, entityDef);
      await upsertDocument(ctx, entity, {
        id: String(doc._id),
        ...doc,
      });

      // Index in Qdrant for semantic search (if has embeddable fields)
      const embeddableFields = getEmbeddableFields(entityDef);
      if (embeddableFields.length > 0) {
        const tenantConfig = await this.configLoader.getTenant(ctx.tenant_id);
        const globalConfig = getProviderConfig();
        const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);

        const textToEmbed = concatFields(doc, embeddableFields);
        if (textToEmbed.trim()) {
          const [vector] = await provider.embedTexts([textToEmbed]);
          await ensureQdrantCollection(ctx.tenant_id, entity, vector.length);

          await upsertQdrantPoint(ctx.tenant_id, entity, {
            id: String(doc._id),
            vector,
            payload: {
              tenant_id: ctx.tenant_id,
              unit_id: ctx.unit_id,
              ...doc,
            },
          });
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error(`Failed to index entity ${entity}/${doc._id}:`, error);
    }
  }

  /**
   * Remove entity from search indexes
   */
  private async removeFromIndexes(
    ctx: TenantContext,
    entity: string,
    id: string,
    entityDef: EntityDefinition
  ): Promise<void> {
    try {
      // Remove from Typesense
      await deleteDocument(ctx, entity, id);

      // Remove from Qdrant
      const embeddableFields = getEmbeddableFields(entityDef);
      if (embeddableFields.length > 0) {
        await deleteQdrantPoint(ctx.tenant_id, entity, id);
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error(`Failed to remove entity ${entity}/${id} from indexes:`, error);
    }
  }
}
