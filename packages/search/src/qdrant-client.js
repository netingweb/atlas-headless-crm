"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureQdrantCollection = ensureQdrantCollection;
exports.upsertQdrantPoint = upsertQdrantPoint;
exports.deleteQdrantPoint = deleteQdrantPoint;
exports.searchQdrant = searchQdrant;
const utils_1 = require("../../utils/src");
const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY;
async function ensureQdrantCollection(tenantId, entity, vectorSize) {
    const collName = (0, utils_1.qdrantCollectionName)(tenantId, entity);
    const url = `${qdrantUrl}/collections/${collName}`;
    try {
        const response = await fetch(url, {
            headers: qdrantApiKey ? { 'api-key': qdrantApiKey } : {},
        });
        if (response.ok) {
            return;
        }
    }
    catch {
    }
    await fetch(`${qdrantUrl}/collections/${collName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(qdrantApiKey ? { 'api-key': qdrantApiKey } : {}),
        },
        body: JSON.stringify({
            vectors: {
                size: vectorSize,
                distance: 'Cosine',
            },
        }),
    });
}
async function upsertQdrantPoint(tenantId, entity, point) {
    const collName = (0, utils_1.qdrantCollectionName)(tenantId, entity);
    const url = `${qdrantUrl}/collections/${collName}/points`;
    await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(qdrantApiKey ? { 'api-key': qdrantApiKey } : {}),
        },
        body: JSON.stringify({
            points: [point],
        }),
    });
}
async function deleteQdrantPoint(tenantId, entity, id) {
    const collName = (0, utils_1.qdrantCollectionName)(tenantId, entity);
    const url = `${qdrantUrl}/collections/${collName}/points/delete`;
    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(qdrantApiKey ? { 'api-key': qdrantApiKey } : {}),
        },
        body: JSON.stringify({
            points: [id],
        }),
    });
}
async function searchQdrant(tenantId, entity, options) {
    const collName = (0, utils_1.qdrantCollectionName)(tenantId, entity);
    const url = `${qdrantUrl}/collections/${collName}/points/search`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(qdrantApiKey ? { 'api-key': qdrantApiKey } : {}),
        },
        body: JSON.stringify({
            vector: options.vector,
            limit: options.limit || 10,
            score_threshold: options.score_threshold,
            filter: options.filter,
        }),
    });
    const data = (await response.json());
    return data.result;
}
//# sourceMappingURL=qdrant-client.js.map