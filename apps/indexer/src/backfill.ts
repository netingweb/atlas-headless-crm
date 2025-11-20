import { loadRootEnv } from '@crm-atlas/utils';
import { connectMongo, getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getEmbeddableFields, concatFields } from '@crm-atlas/utils';
import {
  ensureCollection,
  upsertDocument,
  upsertQdrantPoint,
  ensureQdrantCollection,
} from '@crm-atlas/search';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import type { EntityDefinition } from '@crm-atlas/types';
import {
  buildQdrantPayload,
  buildTenantContext,
  buildTypesenseDocument,
  isGlobalEntity,
  normalizeDocument,
  resolveMongoCollectionName,
} from './typesense-helpers';
import { ensureEmbeddingsApiKey } from './embeddings-config';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

export async function backfillIndexes(): Promise<void> {
  console.log('🔄 Avvio backfill indici...');
  loadRootEnv();

  const configLoader = new MongoConfigLoader(getDb());
  const tenants = await configLoader.getTenants();

  let totalIndexed = 0;

  for (const tenant of tenants) {
    console.log(`\n📋 Tenant: ${tenant.tenant_id}`);
    const units = await configLoader.getUnits(tenant.tenant_id);
    const processedGlobalEntities = new Set<string>();

    for (const unit of units) {
      console.log(`  Unit: ${unit.unit_id}`);
      const entities = await configLoader.getEntities({
        tenant_id: tenant.tenant_id,
        unit_id: unit.unit_id,
      });

      for (const entity of entities) {
        const globalKey = `${tenant.tenant_id}:${entity.name}`;
        const entityIsGlobal = isGlobalEntity(entity);

        if (entityIsGlobal) {
          if (processedGlobalEntities.has(globalKey)) {
            continue;
          }
          processedGlobalEntities.add(globalKey);
        }

        const indexed = await backfillEntity(
          tenant.tenant_id,
          entityIsGlobal ? null : unit.unit_id,
          entity.name,
          entity,
          configLoader
        );
        totalIndexed += indexed;
        const scopeLabel = entityIsGlobal ? 'global' : unit.unit_id;
        console.log(`    ✓ ${entity.name} [${scopeLabel}]: ${indexed} documenti indicizzati`);
      }
    }
  }

  console.log(`\n✅ Backfill completato: ${totalIndexed} documenti totali`);
}

async function backfillEntity(
  tenantId: string,
  unitId: string | null,
  entity: string,
  entityDef: EntityDefinition,
  configLoader: MongoConfigLoader
): Promise<number> {
  const ctx = buildTenantContext(tenantId, unitId);
  const collName = resolveMongoCollectionName(tenantId, unitId, entity, entityDef);
  const db = getDb();
  const collection = db.collection(collName);

  // Ensure collections exist
  await ensureCollection(ctx, entity, entityDef);

  const embeddableFields = getEmbeddableFields(entityDef);
  if (embeddableFields.length > 0) {
    try {
      const tenantConfig = await configLoader.getTenant(tenantId);
      ensureEmbeddingsApiKey(tenantId, tenantConfig?.embeddingsProvider);
      const globalConfig = getProviderConfig();

      // Skip Qdrant if no embeddings provider is configured
      if (!globalConfig.name && !tenantConfig?.embeddingsProvider?.name) {
        console.log(`    ⚠️  Skipping Qdrant for ${entity}: no embeddings provider configured`);
      } else {
        const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);
        const [sampleVector] = await provider.embedTexts(['sample']);
        await ensureQdrantCollection(tenantId, entity, sampleVector.length);
      }
    } catch (error) {
      console.warn(
        `    ⚠️  Failed to setup Qdrant for ${entity}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Get all documents
  const docs = await collection.find({}).toArray();
  let indexed = 0;

  for (const doc of docs) {
    try {
      const docId = String(doc._id);
      const normalizedDoc = normalizeDocument(doc as Record<string, unknown>);

      // Index in Typesense
      const typesenseDoc = buildTypesenseDocument(
        normalizedDoc,
        docId,
        tenantId,
        unitId,
        entityDef
      );

      await upsertDocument(ctx, entity, typesenseDoc, entityDef);

      // Index in Qdrant if has embeddable fields and embeddings provider is configured
      if (embeddableFields.length > 0) {
        try {
          const tenantConfig = await configLoader.getTenant(tenantId);
          ensureEmbeddingsApiKey(tenantId, tenantConfig?.embeddingsProvider);
          const globalConfig = getProviderConfig();

          // Skip Qdrant indexing if no embeddings provider is configured
          if (!globalConfig.name && !tenantConfig?.embeddingsProvider?.name) {
            // Skip silently - already logged during setup
          } else {
            const provider = createEmbeddingsProvider(
              globalConfig,
              tenantConfig?.embeddingsProvider
            );
            const textToEmbed = concatFields(normalizedDoc, embeddableFields);
            if (textToEmbed.trim()) {
              const [vector] = await provider.embedTexts([textToEmbed]);
              const payload = buildQdrantPayload(normalizedDoc, tenantId, unitId, entityDef);
              await upsertQdrantPoint(tenantId, entity, {
                id: docId,
                vector,
                payload,
              });
            }
          }
        } catch (error) {
          // Log error but continue with Typesense indexing
          console.warn(
            `    ⚠️  Failed to index ${entity}/${docId} in Qdrant:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      indexed++;
    } catch (error) {
      console.error(`    ❌ Errore indicizzazione ${entity}/${doc._id}:`, error);
    }
  }

  return indexed;
}

// CLI execution
if (require.main === module) {
  connectMongo(mongoUri, dbName)
    .then(() => {
      console.log('✅ Connesso a MongoDB');
      return backfillIndexes();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Errore backfill:', error);
      process.exit(1);
    });
}
