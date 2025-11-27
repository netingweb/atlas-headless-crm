import type { TenantContext } from '@crm-atlas/core';
import type { EntityDefinition, TenantConfig } from '@crm-atlas/types';
import { ensureCollection, upsertDocument, deleteDocument } from './typesense-client';
import { ensureQdrantCollection, upsertQdrantPoint, deleteQdrantPoint } from './qdrant-client';
import { getEmbeddableFields, concatFields } from '@crm-atlas/utils';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';

export async function indexEntityInSearch(
  ctx: TenantContext,
  entity: string,
  entityDef: EntityDefinition,
  doc: Record<string, unknown>,
  tenantConfig?: TenantConfig | null
): Promise<void> {
  // Typesense full-text index
  await ensureCollection(ctx, entity, entityDef);

  const typesenseDoc: { id: string; [key: string]: unknown } = {
    id: String(doc._id),
    ...doc,
    tenant_id: ctx.tenant_id,
  };

  // Only include unit_id for local entities
  if (entityDef.scope !== 'tenant') {
    typesenseDoc.unit_id = ctx.unit_id;
  }

  // _id is duplicated in id, remove it to avoid schema issues
  delete typesenseDoc._id;

  await upsertDocument(ctx, entity, typesenseDoc, entityDef);

  // Qdrant semantic index (only if entity has embeddable fields)
  const embeddableFields = getEmbeddableFields(entityDef);
  if (embeddableFields.length === 0) {
    return;
  }

  const globalConfig = getProviderConfig();
  const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);

  const textToEmbed = concatFields(doc, embeddableFields);
  if (!textToEmbed.trim()) {
    return;
  }

  const [vector] = await provider.embedTexts([textToEmbed]);
  await ensureQdrantCollection(ctx.tenant_id, entity, vector.length);

  const payload: Record<string, unknown> = {
    tenant_id: ctx.tenant_id,
    ...doc,
  };

  // Only include unit_id for local entities
  if (entityDef.scope !== 'tenant') {
    payload.unit_id = ctx.unit_id;
  }

  await upsertQdrantPoint(ctx.tenant_id, entity, {
    id: String(doc._id),
    vector,
    payload,
  });
}

export async function removeEntityFromSearch(
  ctx: TenantContext,
  entity: string,
  id: string,
  entityDef: EntityDefinition
): Promise<void> {
  // Remove from Typesense
  await deleteDocument(ctx, entity, id, entityDef);

  // Remove from Qdrant only if entity was embedded
  const embeddableFields = getEmbeddableFields(entityDef);
  if (embeddableFields.length > 0) {
    await deleteQdrantPoint(ctx.tenant_id, entity, id);
  }
}




