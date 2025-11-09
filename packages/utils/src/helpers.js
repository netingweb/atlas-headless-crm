"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.randomString = randomString;
exports.collectionName = collectionName;
exports.qdrantCollectionName = qdrantCollectionName;
exports.getEmbeddableFields = getEmbeddableFields;
exports.concatFields = concatFields;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function randomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function collectionName(tenantId, unitId, entity) {
    return `${tenantId}_${unitId}_${entity}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
function qdrantCollectionName(tenantId, entity) {
    return `${tenantId}_${entity}_vectors`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}
function getEmbeddableFields(entityDef) {
    return entityDef.fields
        .filter((f) => f.embeddable && (f.type === 'string' || f.type === 'text'))
        .map((f) => f.name);
}
function concatFields(doc, fields) {
    return fields.map((f) => String(doc[f] || '')).filter(Boolean).join(' ');
}
//# sourceMappingURL=helpers.js.map