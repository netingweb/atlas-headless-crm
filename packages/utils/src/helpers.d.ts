export declare function sleep(ms: number): Promise<void>;
export declare function randomString(length: number): string;
export declare function collectionName(tenantId: string, unitId: string, entity: string): string;
export declare function qdrantCollectionName(tenantId: string, entity: string): string;
export declare function getEmbeddableFields(entityDef: {
  fields: Array<{
    name: string;
    embeddable?: boolean;
    type: string;
  }>;
}): string[];
export declare function concatFields(doc: Record<string, unknown>, fields: string[]): string;
//# sourceMappingURL=helpers.d.ts.map
