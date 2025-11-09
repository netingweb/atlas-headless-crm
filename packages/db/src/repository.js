"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRepository = void 0;
const mongodb_1 = require("mongodb");
const connection_1 = require("./connection");
const utils_1 = require("../../utils/src");
class EntityRepository {
    async create(ctx, entity, data) {
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
        const coll = (0, connection_1.getDb)().collection((0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity));
        const result = await coll.insertOne(doc);
        return { ...doc, _id: result.insertedId.toString() };
    }
    async findById(ctx, entity, id) {
        const coll = (0, connection_1.getDb)().collection((0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity));
        const doc = await coll.findOne({ _id: new mongodb_1.ObjectId(id) });
        return doc ? { ...doc, _id: doc._id.toString() } : null;
    }
    async update(ctx, entity, id, data) {
        const coll = (0, connection_1.getDb)().collection((0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity));
        const result = await coll.findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, { $set: { ...data, updated_at: new Date() } }, { returnDocument: 'after' });
        return result ? { ...result, _id: result._id.toString() } : null;
    }
    async delete(ctx, entity, id) {
        const coll = (0, connection_1.getDb)().collection((0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity));
        const result = await coll.deleteOne({ _id: new mongodb_1.ObjectId(id) });
        return result.deletedCount > 0;
    }
    async find(ctx, entity, filter = {}) {
        const coll = (0, connection_1.getDb)().collection((0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity));
        const cursor = coll.find({ ...filter, tenant_id: ctx.tenant_id, unit_id: ctx.unit_id });
        const docs = await cursor.toArray();
        return docs.map((doc) => ({ ...doc, _id: doc._id.toString() }));
    }
}
exports.EntityRepository = EntityRepository;
//# sourceMappingURL=repository.js.map