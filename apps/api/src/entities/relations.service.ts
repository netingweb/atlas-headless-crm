import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@crm-atlas/core';
import type { TenantContext } from '@crm-atlas/core';
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

    // Query related entities
    const relatedDocs = await this.repository.find(
      ctx,
      relatedEntity,
      {
        [referenceField]: id,
      },
      relatedEntityDef
    );

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
      if (refValue && typeof refValue === 'string') {
        const referencedEntity = field.reference_entity!;
        // Load entity definition for referenced entity to determine scope (tenant vs unit)
        const referencedEntityDef = await this.configLoader.getEntity(ctx, referencedEntity);
        if (!referencedEntityDef) {
          throw new NotFoundError(
            `Referenced entity definition not found: ${referencedEntity} (field: ${field.name})`
          );
        }

        // Verify scope is set correctly
        if (!referencedEntityDef.scope) {
          console.warn('[RelationsService] Entity definition missing scope, defaulting to unit:', {
            referencedEntity,
            field: field.name,
          });
          referencedEntityDef.scope = 'unit';
        }

        // Log for debugging
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

        // Pass entityDef to findById so it knows the correct scope (tenant vs unit)
        console.log('[RelationsService] Calling repository.findById with entityDef:', {
          referencedEntity,
          refValue,
          scope: referencedEntityDef.scope,
          hasEntityDef: !!referencedEntityDef,
          entityDefKeys: referencedEntityDef ? Object.keys(referencedEntityDef) : [],
        });
        let refDoc = await this.repository.findById(
          ctx,
          referencedEntity,
          refValue,
          referencedEntityDef
        );
        console.log('[RelationsService] findById result:', {
          found: !!refDoc,
          referencedEntity,
          refValue,
          scope: referencedEntityDef.scope,
        });

        // If not found and entity is global, try searching without unit_id filter as fallback
        // This handles cases where entities were created before scope was properly defined
        if (!refDoc && referencedEntityDef.scope === 'tenant') {
          console.warn(
            '[RelationsService] Global entity not found with scope check, trying direct collection lookup:',
            {
              referencedEntity,
              refValue,
              tenant_id: ctx.tenant_id,
            }
          );

          // Try direct lookup in global collection without unit_id filter
          // First try without unit_id filter at all
          const { ObjectId } = await import('mongodb');
          const db = getDb();
          const globalCollection = db.collection(`${ctx.tenant_id}_${referencedEntity}`);

          // Try simple lookup first (most common case)
          let globalDoc = await globalCollection.findOne({
            _id: new ObjectId(refValue),
            tenant_id: ctx.tenant_id,
          });

          // If found but has unit_id, it's not a global entity - skip it
          if (globalDoc && globalDoc.unit_id) {
            globalDoc = null;
          }

          // If still not found, try with explicit null/undefined check
          if (!globalDoc) {
            globalDoc = await globalCollection.findOne({
              _id: new ObjectId(refValue),
              tenant_id: ctx.tenant_id,
              $or: [{ unit_id: { $exists: false } }, { unit_id: null }],
            });
          }

          if (globalDoc) {
            console.warn('[RelationsService] Found entity in global collection without unit_id');
            // Normalize the document
            const normalized: Record<string, unknown> = Object.assign({}, globalDoc);
            normalized._id = globalDoc._id.toString();
            refDoc = normalized as any;
          }
        }

        if (!refDoc) {
          // Log additional info for debugging
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
      if (refValue && typeof refValue === 'string') {
        const referencedEntity = field.reference_entity!;
        // Load entity definition for referenced entity to determine scope (tenant vs unit)
        const referencedEntityDef = await this.configLoader.getEntity(ctx, referencedEntity);
        if (referencedEntityDef) {
          // Pass entityDef to findById so it knows the correct scope (tenant vs unit)
          const refDoc = await this.repository.findById(
            ctx,
            referencedEntity,
            refValue,
            referencedEntityDef
          );
          if (refDoc) {
            // Add populated field with _ prefix (e.g., company_id -> _company)
            const populatedFieldName = `_${field.name.replace('_id', '')}`;
            populated[populatedFieldName] = refDoc;
          }
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
}
