import type { TenantContext, BaseDocument } from '@crm-atlas/core';
import { ObjectId, type Document, type WithId } from 'mongodb';
import { getDb } from './connection';
import { collectionName } from '@crm-atlas/utils';
import type { EntityDefinition } from '@crm-atlas/types';

export class EntityRepository {
  private normalizeDocument<T extends BaseDocument>(doc: WithId<Document>): T {
    // Use Object.assign to create a shallow copy of all enumerable properties
    // This ensures all properties from the MongoDB document are copied
    const plainDoc: Record<string, unknown> = Object.assign({}, doc);

    // Convert _id to string (it's already in the object but we ensure it's a string)
    plainDoc._id = doc._id.toString();

    // Explicitly preserve created_at and updated_at if they exist
    // These are Date objects from MongoDB and should be preserved as-is
    if ('created_at' in doc && doc.created_at !== undefined) {
      plainDoc.created_at = doc.created_at;
    }
    if ('updated_at' in doc && doc.updated_at !== undefined) {
      plainDoc.updated_at = doc.updated_at;
    }

    return plainDoc as T;
  }

  async create<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    data: Omit<T, keyof BaseDocument>,
    entityDef?: EntityDefinition
  ): Promise<T> {
    const isGlobal = entityDef?.scope === 'tenant';
    const now = new Date();
    const doc: Record<string, unknown> = {
      ...data,
      tenant_id: ctx.tenant_id,
      app_id: ctx.app_id,
      created_at: now,
      updated_at: now,
    };

    // Only add unit_id for local entities
    if (!isGlobal) {
      doc.unit_id = ctx.unit_id;
      doc.ownership = {
        owner_unit: ctx.unit_id,
        visible_to: [],
      };
      doc.visible_to = [];
    } else {
      // For global entities, still track ownership but without unit_id
      doc.ownership = {
        owner_unit: ctx.unit_id || 'global',
        visible_to: [],
      };
      doc.visible_to = [];
    }

    const coll = getDb().collection(
      collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal)
    );
    const result = await coll.insertOne(doc);
    const createdDoc: WithId<Document> = {
      ...doc,
      _id: result.insertedId,
    };
    return this.normalizeDocument<T>(createdDoc);
  }

  async findById<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    id: string,
    entityDef?: EntityDefinition
  ): Promise<T | null> {
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const isGlobal = entityDef?.scope === 'tenant';
    const coll = getDb().collection(
      collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal)
    );
    const filter: Record<string, unknown> = { _id: new ObjectId(id), tenant_id: ctx.tenant_id };
    if (!isGlobal) {
      filter.unit_id = ctx.unit_id;
    }
    const doc = await coll.findOne(filter);
    if (!doc) {
      return null;
    }

    return this.normalizeDocument<T>(doc);
  }

  async update<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    id: string,
    data: Partial<Omit<T, keyof BaseDocument | '_id'>>,
    entityDef?: EntityDefinition
  ): Promise<T | null> {
    console.log('[DB Repository] Update called:', {
      tenant_id: ctx.tenant_id,
      unit_id: ctx.unit_id,
      entity,
      id,
      dataKeys: Object.keys(data as object),
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      console.log('[DB Repository] Invalid ObjectId:', id);
      return null;
    }

    const isGlobal = entityDef?.scope === 'tenant';
    const collName = collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal);
    console.log('[DB Repository] Collection name:', collName);

    const coll = getDb().collection(collName);

    // Filter out fields that should not be updated
    const dataObj = data as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, tenant_id, unit_id, created_at, ...rest } = dataObj;

    // Also filter out any fields starting with _ (they are virtual/populated fields)
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (!key.startsWith('_')) {
        updateData[key] = value;
      }
    }

    console.log('[DB Repository] Filtered update data:', {
      originalKeys: Object.keys(dataObj),
      updateKeys: Object.keys(updateData),
      removedKeys: Object.keys(dataObj).filter((k) => !(k in updateData)),
    });

    // Perform the update (only update provided fields, preserve tenant_id, unit_id, created_at)
    const updatePayload = { $set: { ...updateData, updated_at: new Date() } };
    console.log('[DB Repository] Update payload:', {
      filter: { _id: id },
      update: updatePayload,
      options: { returnDocument: 'after' },
    });

    const filter: Record<string, unknown> = { _id: new ObjectId(id), tenant_id: ctx.tenant_id };
    if (!isGlobal) {
      filter.unit_id = ctx.unit_id;
    }
    const result = await coll.findOneAndUpdate(filter, updatePayload, {
      returnDocument: 'after',
    });

    console.log('[DB Repository] Raw MongoDB result:', {
      resultType: typeof result,
      resultKeys: result ? Object.keys(result) : [],
      hasId: result && '_id' in result,
      idValue: result?._id?.toString(),
    });

    // In MongoDB Driver 6.x, findOneAndUpdate returns the document directly, not in a .value property
    if (!result) {
      console.log('[DB Repository] Update failed: document not found');
      return null;
    }

    const normalized = this.normalizeDocument<T>(result);
    console.log('[DB Repository] Normalized result:', {
      _id: (normalized as any)._id,
      keys: Object.keys(normalized as object),
    });

    return normalized;
  }

  async delete(
    ctx: TenantContext,
    entity: string,
    id: string,
    entityDef?: EntityDefinition
  ): Promise<boolean> {
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return false;
    }

    const isGlobal = entityDef?.scope === 'tenant';
    const coll = getDb().collection(
      collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal)
    );
    const filter: Record<string, unknown> = { _id: new ObjectId(id), tenant_id: ctx.tenant_id };
    if (!isGlobal) {
      filter.unit_id = ctx.unit_id;
    }
    const result = await coll.deleteOne(filter);
    return result.deletedCount > 0;
  }

  async find<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    filter: Record<string, unknown> = {},
    entityDef?: EntityDefinition
  ): Promise<T[]> {
    const isGlobal = entityDef?.scope === 'tenant';
    const coll = getDb().collection(
      collectionName(ctx.tenant_id, isGlobal ? null : ctx.unit_id, entity, isGlobal)
    );
    const queryFilter: Record<string, unknown> = { ...filter, tenant_id: ctx.tenant_id };
    if (!isGlobal) {
      queryFilter.unit_id = ctx.unit_id;
    }
    const cursor = coll.find(queryFilter);
    const docs = await cursor.toArray();
    return docs.map((doc) => this.normalizeDocument<T>(doc));
  }
}
