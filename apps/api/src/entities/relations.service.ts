import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@crm-atlas/core';
import type { TenantContext, BaseDocument } from '@crm-atlas/core';
import { EntityRepository } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getDb } from '@crm-atlas/db';
import type { EntityDefinition, FieldDefinition } from '@crm-atlas/types';

@Injectable()
export class RelationsService {
  private readonly repository = new EntityRepository();
  private readonly configLoader = new MongoConfigLoader(getDb());

  /**
   * Get related entities for a given entity
   * Example: Get all contacts for a company
   */
  async getRelatedEntities(
    ctx: TenantContext,
    entity: string,
    id: string,
    relatedEntity: string,
    referenceField: string
  ): Promise<unknown[]> {
    // Load source entity definition to determine scope
    const sourceEntityDef = await this.configLoader.getEntity(ctx, entity);
    if (!sourceEntityDef) {
      throw new NotFoundError(`Entity ${entity} not found`);
    }
    // Verify source entity exists - pass entityDef to handle scope correctly
    const sourceDoc = await this.repository.findById(ctx, entity, id, sourceEntityDef);
    if (!sourceDoc) {
      throw new NotFoundError(`Resource not found: ${entity}/${id}`);
    }

    // Verify related entity definition exists
    const relatedEntityDef = await this.configLoader.getEntity(ctx, relatedEntity);
    if (!relatedEntityDef) {
      throw new NotFoundError(`Entity ${relatedEntity} not found`);
    }

    // Verify reference field exists in related entity
    const refField = relatedEntityDef.fields.find((f) => f.name === referenceField);
    if (!refField || refField.type !== 'reference' || refField.reference_entity !== entity) {
      throw new NotFoundError(
        `Reference field ${referenceField} not found or invalid in entity ${relatedEntity}`
      );
    }

    const filter =
      refField.multiple === true
        ? {
            [referenceField]: {
              $in: [id],
            },
          }
        : {
            [referenceField]: id,
          };

    const relatedDocs = await this.repository.find(ctx, relatedEntity, filter, relatedEntityDef);

    return relatedDocs;
  }

  /**
   * Validate that referenced entities exist
   */
  async validateReferences(
    ctx: TenantContext,
    entityDef: EntityDefinition,
    data: Record<string, unknown>
  ): Promise<void> {
    const referenceFields = entityDef.fields.filter(
      (f) => f.type === 'reference' && f.reference_entity
    );

    for (const field of referenceFields) {
      const refValue = data[field.name];
      if (!refValue) {
        continue;
      }

      const values = Array.isArray(refValue) ? refValue : [refValue];
      for (const value of values) {
        if (typeof value !== 'string') {
          continue;
        }
        await this.ensureReferenceValueExists(ctx, field, value);
      }
    }
  }

  /**
   * Populate reference fields with related entity data
   */
  async populateReferences(
    ctx: TenantContext,
    entityDef: EntityDefinition,
    doc: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const referenceFields = entityDef.fields.filter(
      (f) => f.type === 'reference' && f.reference_entity
    );

    const populated = { ...doc };

    for (const field of referenceFields) {
      const refValue = doc[field.name];
      if (!refValue) {
        continue;
      }

      const referencedEntity = field.reference_entity!;
      const referencedEntityDef = await this.configLoader.getEntity(ctx, referencedEntity);
      if (!referencedEntityDef) {
        continue;
      }

      const populatedFieldName = this.getPopulatedFieldName(field.name);
      const values = Array.isArray(refValue) ? refValue : [refValue];

      if (field.multiple === true) {
        const populatedRefs: BaseDocument[] = [];
        for (const value of values) {
          if (typeof value !== 'string') {
            continue;
          }
          const refDoc = await this.repository.findById(
            ctx,
            referencedEntity,
            value,
            referencedEntityDef
          );
          if (refDoc) {
            populatedRefs.push(refDoc as BaseDocument);
          }
        }
        if (populatedRefs.length > 0) {
          populated[populatedFieldName] = populatedRefs;
        }
      } else if (typeof values[0] === 'string') {
        const refDoc = await this.repository.findById(
          ctx,
          referencedEntity,
          values[0] as string,
          referencedEntityDef
        );
        if (refDoc) {
          populated[populatedFieldName] = refDoc;
        }
      }
    }

    return populated;
  }

  /**
   * Get all reference fields for an entity that point to a specific target entity
   */
  async getReferenceFieldsToEntity(
    ctx: TenantContext,
    sourceEntity: string,
    targetEntity: string
  ): Promise<Array<{ field: FieldDefinition; entity: string }>> {
    const sourceEntityDef = await this.configLoader.getEntity(ctx, sourceEntity);
    if (!sourceEntityDef) {
      return [];
    }

    return sourceEntityDef.fields
      .filter((f) => f.type === 'reference' && f.reference_entity === targetEntity)
      .map((field) => ({ field, entity: sourceEntity }));
  }

  private async ensureReferenceValueExists(
    ctx: TenantContext,
    field: FieldDefinition,
    refValue: string
  ): Promise<void> {
    const referencedEntity = field.reference_entity!;
    const referencedEntityDef = await this.configLoader.getEntity(ctx, referencedEntity);
    if (!referencedEntityDef) {
      throw new NotFoundError(
        `Referenced entity definition not found: ${referencedEntity} (field: ${field.name})`
      );
    }

    if (!referencedEntityDef.scope) {
      console.warn('[RelationsService] Entity definition missing scope, defaulting to unit:', {
        referencedEntity,
        field: field.name,
      });
      referencedEntityDef.scope = 'unit';
    }

    console.log('[RelationsService] Validating reference:', {
      field: field.name,
      referencedEntity,
      refValue,
      scope: referencedEntityDef.scope,
      tenant_id: ctx.tenant_id,
      unit_id: ctx.unit_id,
      entityDefName: referencedEntityDef.name,
      isGlobal: referencedEntityDef.scope === 'tenant',
    });

    let refDoc = await this.repository.findById(
      ctx,
      referencedEntity,
      refValue,
      referencedEntityDef
    );

    if (!refDoc && referencedEntityDef.scope === 'tenant') {
      const { ObjectId } = await import('mongodb');
      const db = getDb();
      const globalCollection = db.collection(`${ctx.tenant_id}_${referencedEntity}`);

      let globalDoc = await globalCollection.findOne({
        _id: new ObjectId(refValue),
        tenant_id: ctx.tenant_id,
      });

      if (globalDoc && globalDoc.unit_id) {
        globalDoc = null;
      }

      if (!globalDoc) {
        globalDoc = await globalCollection.findOne({
          _id: new ObjectId(refValue),
          tenant_id: ctx.tenant_id,
          $or: [{ unit_id: { $exists: false } }, { unit_id: null }],
        });
      }

      if (globalDoc) {
        const normalized: Record<string, unknown> = Object.assign({}, globalDoc);
        normalized._id = globalDoc._id.toString();
        refDoc = normalized as any;
      }
    }

    if (!refDoc) {
      const isGlobal = referencedEntityDef.scope === 'tenant';
      const expectedCollection = isGlobal
        ? `${ctx.tenant_id}_${referencedEntity}`
        : `${ctx.tenant_id}_${ctx.unit_id}_${referencedEntity}`;

      console.error('[RelationsService] Reference not found:', {
        field: field.name,
        referencedEntity,
        refValue,
        scope: referencedEntityDef.scope,
        tenant_id: ctx.tenant_id,
        unit_id: ctx.unit_id,
        isGlobal,
        expectedCollection,
      });

      throw new NotFoundError(
        `Referenced entity not found: ${referencedEntity}/${refValue} (field: ${field.name}). ` +
          `Expected in collection: ${expectedCollection} (scope: ${referencedEntityDef.scope}). ` +
          `Please verify that the ${referencedEntity} with ID ${refValue} exists in the database.`
      );
    }
  }

  private getPopulatedFieldName(fieldName: string): string {
    if (fieldName.endsWith('_ids')) {
      return `_${fieldName.replace('_ids', '')}`;
    }
    if (fieldName.endsWith('_id')) {
      return `_${fieldName.replace('_id', '')}`;
    }
    return `_${fieldName}`;
  }
}
