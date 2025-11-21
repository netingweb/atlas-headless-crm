import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { NotFoundError, ValidationError } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';
import { ValidatorCache } from '@crm-atlas/core';
import { EntityRepository } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import type { EntityDefinition, FieldDefinition } from '@crm-atlas/types';
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
  private readonly logger = new Logger(EntitiesService.name);
  private readonly repository = new EntityRepository();
  private readonly configLoader = new MongoConfigLoader(getDb());
  private readonly validatorCache: ValidatorCache;
  private readonly relationsService = new RelationsService();

  constructor(
    @Optional() private readonly events?: EntityEvents,
    @Optional() @Inject(ValidatorCache) validatorCache?: ValidatorCache
  ) {
    this.validatorCache = validatorCache || new ValidatorCache();
  }

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

    const created = await this.repository.create(ctx, entity, data, entityDef);
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
    const doc = await this.repository.findById(ctx, entity, id, entityDef);
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
    this.logger.debug('Update called', {
      tenant_id: ctx.tenant_id,
      unit_id: ctx.unit_id,
      entity,
      id,
      dataKeys: Object.keys(data),
    });

    const entityDef = await this.ensureEntityExists(ctx, entity);
    this.logger.debug(`Entity definition loaded: ${entityDef.name}`);

    // For updates, validate only provided fields (partial updates)
    // Create a schema without required fields for partial validation
    const updateSchema = this.buildPartialUpdateSchema(entityDef);
    const validator = this.validatorCache.getOrCompileForUpdate(
      ctx.tenant_id,
      entity,
      updateSchema
    );
    const valid = validator(data);

    if (!valid) {
      this.logger.warn('Validation failed', { errors: validator.errors });
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

    this.logger.debug('Validation passed');

    // Validate referenced entities exist
    await this.relationsService.validateReferences(ctx, entityDef, data);
    this.logger.debug('References validated');

    const updated = await this.repository.update(ctx, entity, id, data, entityDef);
    const updatedRecord = updated as Record<string, unknown> | null;
    this.logger.debug('Repository update result', {
      success: !!updated,
      updatedId: updatedRecord?._id ?? null,
    });

    if (!updated) {
      this.logger.warn(`Update failed: Resource not found ${entity}/${id}`);
      throw new NotFoundError(`Resource not found: ${entity}/${id}`);
    }

    // Re-index in Typesense and Qdrant
    this.logger.debug('Re-indexing entity');
    await this.indexEntity(ctx, entity, entityDef, updatedRecord as Record<string, unknown>);

    // Emit event for workflow engine (if available)
    if (this.events) {
      this.logger.debug('Emitting entity.updated event');
      this.events.emitEntityUpdated(ctx.tenant_id, ctx.unit_id, entity, id, data);
    }

    this.logger.debug('Update completed successfully');
    return updated;
  }

  async delete(ctx: TenantContext, entity: string, id: string): Promise<void> {
    const entityDef = await this.ensureEntityExists(ctx, entity);
    const deleted = await this.repository.delete(ctx, entity, id, entityDef);
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
    const entityDef = await this.ensureEntityExists(ctx, entity);
    return this.repository.find(ctx, entity, {}, entityDef);
  }

  private async ensureEntityExists(ctx: TenantContext, entity: string): Promise<EntityDefinition> {
    const entityDef = await this.configLoader.getEntity(ctx, entity);
    if (!entityDef) {
      throw new NotFoundError(`Entity ${entity} not found`);
    }
    return entityDef;
  }

  /**
   * Build a JSON schema for partial updates (no required fields)
   */
  private buildPartialUpdateSchema(entityDef: EntityDefinition): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    for (const field of entityDef.fields) {
      properties[field.name] = this.fieldToJsonSchema(field);
    }

    return {
      type: 'object',
      properties,
      // No required fields for partial updates
      additionalProperties: true,
    };
  }

  /**
   * Convert field definition to JSON schema property
   */
  private fieldToJsonSchema(field: FieldDefinition): Record<string, unknown> {
    const baseSchema: Record<string, unknown> = {};

    switch (field.type) {
      case 'string':
      case 'text':
      case 'email':
      case 'url':
        baseSchema.type = 'string';
        break;
      case 'number':
        baseSchema.type = 'number';
        break;
      case 'boolean':
        baseSchema.type = 'boolean';
        break;
      case 'date':
        baseSchema.type = 'string';
        baseSchema.format = 'date-time';
        break;
      case 'datetime':
        baseSchema.type = 'string';
        baseSchema.format = 'date-time';
        break;
      case 'json':
        // JSON fields can be any type
        break;
      case 'reference':
        baseSchema.type = 'string';
        break;
      default:
        baseSchema.type = 'string';
    }

    // Handle validation constraints
    if (field.validation) {
      if ('enum' in field.validation && Array.isArray(field.validation.enum)) {
        baseSchema.enum = field.validation.enum;
      }
      if ('min' in field.validation) {
        baseSchema.minimum = field.validation.min;
      }
      if ('max' in field.validation) {
        baseSchema.maximum = field.validation.max;
      }
      if ('minLength' in field.validation) {
        baseSchema.minLength = field.validation.minLength;
      }
      if ('maxLength' in field.validation) {
        baseSchema.maxLength = field.validation.maxLength;
      }
    }

    if (field.multiple === true) {
      return {
        type: 'array',
        items: Object.keys(baseSchema).length > 0 ? baseSchema : {},
      };
    }

    return baseSchema;
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

      // Prepare document for Typesense (ensure id is string and remove MongoDB _id)
      const typesenseDoc: { id: string; [key: string]: unknown } = {
        id: String(doc._id),
        ...doc,
        // Ensure tenant/unit are always present for Typesense faceting/filters
        tenant_id: ctx.tenant_id,
      };
      // Only add unit_id for local entities
      if (entityDef.scope !== 'tenant') {
        typesenseDoc.unit_id = ctx.unit_id;
      }
      // Remove _id to avoid duplication (we use id instead)
      delete typesenseDoc._id;

      await upsertDocument(ctx, entity, typesenseDoc, entityDef);

      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Indexed ${entity}/${String(doc._id)} in Typesense`);
      }

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

          const qdrantPayload: Record<string, unknown> = {
            tenant_id: ctx.tenant_id,
            ...doc,
          };
          // Only add unit_id for local entities
          if (entityDef.scope !== 'tenant') {
            qdrantPayload.unit_id = ctx.unit_id;
          }
          await upsertQdrantPoint(ctx.tenant_id, entity, {
            id: String(doc._id),
            vector,
            payload: qdrantPayload,
          });
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      this.logger.error(
        `Failed to index entity ${entity}/${String(doc._id)}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Re-throw in development to help debug indexing issues
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Indexing error details', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack',
        });
      }
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
      await deleteDocument(ctx, entity, id, entityDef);

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
