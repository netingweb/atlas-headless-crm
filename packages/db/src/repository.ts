import type { TenantContext, BaseDocument } from '@crm-atlas/core';
import { ObjectId } from 'mongodb';
import { getDb } from './connection';
import { collectionName } from '@crm-atlas/utils';

export class EntityRepository {
  async create<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    data: Omit<T, keyof BaseDocument>
  ): Promise<T> {
    const now = new Date();
    const doc = {
      ...data,
      tenant_id: ctx.tenant_id,
      unit_id: ctx.unit_id,
      app_id: ctx.app_id,
      ownership: {
        owner_unit: ctx.unit_id,
        visible_to: [],
      },
      visible_to: [],
      created_at: now,
      updated_at: now,
    };

    const coll = getDb().collection(collectionName(ctx.tenant_id, ctx.unit_id, entity));
    const result = await coll.insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() } as unknown as T;
  }

  async findById<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    id: string
  ): Promise<T | null> {
    const coll = getDb().collection(collectionName(ctx.tenant_id, ctx.unit_id, entity));
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    return doc ? ({ ...doc, _id: doc._id.toString() } as T) : null;
  }

  async update<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    id: string,
    data: Partial<Omit<T, keyof BaseDocument | '_id'>>
  ): Promise<T | null> {
    const coll = getDb().collection(collectionName(ctx.tenant_id, ctx.unit_id, entity));
    const result = await coll.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? ({ ...result, _id: result._id.toString() } as T) : null;
  }

  async delete(ctx: TenantContext, entity: string, id: string): Promise<boolean> {
    const coll = getDb().collection(collectionName(ctx.tenant_id, ctx.unit_id, entity));
    const result = await coll.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async find<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    filter: Record<string, unknown> = {}
  ): Promise<T[]> {
    const coll = getDb().collection(collectionName(ctx.tenant_id, ctx.unit_id, entity));
    const cursor = coll.find({ ...filter, tenant_id: ctx.tenant_id, unit_id: ctx.unit_id });
    const docs = await cursor.toArray();
    return docs.map((doc) => ({ ...doc, _id: doc._id.toString() }) as T);
  }
}
