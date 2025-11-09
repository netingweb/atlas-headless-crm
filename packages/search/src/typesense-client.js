"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypesenseClient = getTypesenseClient;
exports.ensureCollection = ensureCollection;
exports.upsertDocument = upsertDocument;
exports.deleteDocument = deleteDocument;
exports.search = search;
const typesense_1 = __importDefault(require("typesense"));
const utils_1 = require("../../utils/src");
const host = process.env.TYPESENSE_HOST || 'localhost';
const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);
const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
const apiKey = process.env.TYPESENSE_API_KEY || 'xyz';
let client = null;
function getTypesenseClient() {
    if (!client) {
        client = new typesense_1.default.Client({
            nodes: [
                {
                    host,
                    port,
                    protocol,
                },
            ],
            apiKey,
            connectionTimeoutSeconds: 2,
        });
    }
    return client;
}
async function ensureCollection(ctx, entity, entityDef) {
    const client = getTypesenseClient();
    const collName = (0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity);
    try {
        await client.collections(collName).retrieve();
    }
    catch {
        const schema = buildTypesenseSchema(entityDef, collName);
        await client.collections().create(schema);
    }
}
async function upsertDocument(ctx, entity, doc) {
    const client = getTypesenseClient();
    const collName = (0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity);
    await client.collections(collName).documents().upsert(doc);
}
async function deleteDocument(ctx, entity, id) {
    const client = getTypesenseClient();
    const collName = (0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity);
    await client.collections(collName).documents(id).delete();
}
async function search(ctx, entity, options) {
    const client = getTypesenseClient();
    const collName = (0, utils_1.collectionName)(ctx.tenant_id, ctx.unit_id, entity);
    const searchParams = {
        q: options.q,
        query_by: options.query_by || '*',
        filter_by: options.filter_by,
        facet_by: options.facet_by,
        per_page: options.per_page || 10,
        page: options.page || 1,
    };
    const result = await client.collections(collName).documents().search(searchParams);
    return {
        hits: (result.hits?.map((h) => h.document) || []),
        found: result.found || 0,
        page: result.page || 1,
    };
}
function buildTypesenseSchema(entityDef, name) {
    const fields = [
        { name: 'id', type: 'string' },
        { name: 'tenant_id', type: 'string', facet: true },
        { name: 'unit_id', type: 'string', facet: true },
    ];
    for (const field of entityDef.fields) {
        if (field.indexed || field.searchable) {
            const tsField = {
                name: field.name,
                type: mapFieldTypeToTypesense(field.type),
            };
            if (field.searchable) {
                tsField.index = true;
            }
            if (field.type === 'string' || field.type === 'text' || field.type === 'email') {
                tsField.facet = true;
            }
            fields.push(tsField);
        }
    }
    return {
        name,
        fields,
        default_sorting_field: 'id',
    };
}
function mapFieldTypeToTypesense(fieldType) {
    switch (fieldType) {
        case 'string':
        case 'email':
        case 'url':
        case 'text':
            return 'string';
        case 'number':
            return 'int32';
        case 'boolean':
            return 'bool';
        case 'date':
            return 'int64';
        default:
            return 'string';
    }
}
//# sourceMappingURL=typesense-client.js.map