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
    // Verify source entity exists
    const sourceDoc = await this.repository.findById(ctx, entity, id);
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
        const refDoc = await this.repository.findById(ctx, referencedEntity, refValue);
        if (!refDoc) {
          throw new NotFoundError(
            `Referenced entity not found: ${referencedEntity}/${refValue} (field: ${field.name})`
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
        const refDoc = await this.repository.findById(ctx, referencedEntity, refValue);
        if (refDoc) {
          // Add populated field with _ prefix (e.g., company_id -> _company)
          const populatedFieldName = `_${field.name.replace('_id', '')}`;
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
}
