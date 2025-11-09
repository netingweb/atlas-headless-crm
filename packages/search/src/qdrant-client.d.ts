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
export declare function ensureQdrantCollection(
  tenantId: string,
  entity: string,
  vectorSize: number
): Promise<void>;
export declare function upsertQdrantPoint(
  tenantId: string,
  entity: string,
  point: QdrantPoint
): Promise<void>;
export declare function deleteQdrantPoint(
  tenantId: string,
  entity: string,
  id: string | number
): Promise<void>;
export declare function searchQdrant(
  tenantId: string,
  entity: string,
  options: QdrantSearchOptions
): Promise<
  Array<{
    id: string | number;
    score: number;
    payload: Record<string, unknown>;
  }>
>;
//# sourceMappingURL=qdrant-client.d.ts.map
