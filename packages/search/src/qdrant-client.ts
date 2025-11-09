import { qdrantCollectionName } from '@crm-atlas/utils';

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY;

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface QdrantSearchOptions {
  vector: number[];
  limit?: number;
  score_threshold?: number;
  filter?: Record<string, unknown>;
}

export async function ensureQdrantCollection(
  tenantId: string,
  entity: string,
  vectorSize: number
): Promise<void> {
  const collName = qdrantCollectionName(tenantId, entity);
  const url = `${qdrantUrl}/collections/${collName}`;

  try {
    const response = await fetch(url, {
      headers: qdrantApiKey ? { 'api-key': qdrantApiKey } : {},
    });

    if (response.ok) {
      return;
    }
  } catch {
    // Collection doesn't exist, create it
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

export async function upsertQdrantPoint(
  tenantId: string,
  entity: string,
  point: QdrantPoint
): Promise<void> {
  const collName = qdrantCollectionName(tenantId, entity);
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

export async function deleteQdrantPoint(
  tenantId: string,
  entity: string,
  id: string | number
): Promise<void> {
  const collName = qdrantCollectionName(tenantId, entity);
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

export async function searchQdrant(
  tenantId: string,
  entity: string,
  options: QdrantSearchOptions
): Promise<Array<{ id: string | number; score: number; payload: Record<string, unknown> }>> {
  const collName = qdrantCollectionName(tenantId, entity);
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

  const data = (await response.json()) as {
    result: Array<{ id: string | number; score: number; payload: Record<string, unknown> }>;
  };
  return data.result;
}
