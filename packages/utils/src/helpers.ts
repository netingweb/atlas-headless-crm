export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function collectionName(
  tenantId: string,
  unitId: string | null,
  entity: string,
  isGlobal = false
): string {
  if (isGlobal || unitId === null) {
    // Global entity: tenant-wide collection
    return `${tenantId}_${entity}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  // Local entity: unit-specific collection
  return `${tenantId}_${unitId}_${entity}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export function qdrantCollectionName(tenantId: string, entity: string): string {
  return `${tenantId}_${entity}_vectors`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export function getEmbeddableFields(entityDef: {
  fields: Array<{ name: string; embeddable?: boolean; type: string }>;
}): string[] {
  return entityDef.fields
    .filter((f) => f.embeddable && (f.type === 'string' || f.type === 'text'))
    .map((f) => f.name);
}

export function concatFields(doc: Record<string, unknown>, fields: string[]): string {
  return fields
    .map((f) => String(doc[f] || ''))
    .filter(Boolean)
    .join(' ');
}
