import { connectMongo, getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { collectionName } from '@crm-atlas/utils';
import { getEmbeddableFields, concatFields } from '@crm-atlas/utils';
import {
  ensureCollection,
  upsertDocument,
  upsertQdrantPoint,
  ensureQdrantCollection,
} from '@crm-atlas/search';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import type { EntityDefinition } from '@crm-atlas/types';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

export async function backfillIndexes(): Promise<void> {
  console.log('🔄 Avvio backfill indici...');

  const configLoader = new MongoConfigLoader(getDb());
  const tenants = await configLoader.getTenants();

  let totalIndexed = 0;

  for (const tenant of tenants) {
    console.log(`\n📋 Tenant: ${tenant.tenant_id}`);
    const units = await configLoader.getUnits(tenant.tenant_id);

    for (const unit of units) {
      console.log(`  Unit: ${unit.unit_id}`);
      const entities = await configLoader.getEntities({
        tenant_id: tenant.tenant_id,
        unit_id: unit.unit_id,
      });

      for (const entity of entities) {
        const indexed = await backfillEntity(
          tenant.tenant_id,
          unit.unit_id,
          entity.name,
          entity,
          configLoader
        );
        totalIndexed += indexed;
        console.log(`    ✓ ${entity.name}: ${indexed} documenti indicizzati`);
      }
    }
  }

  console.log(`\n✅ Backfill completato: ${totalIndexed} documenti totali`);
}

async function backfillEntity(
  tenantId: string,
  unitId: string,
  entity: string,
  entityDef: EntityDefinition,
  configLoader: MongoConfigLoader
): Promise<number> {
  const ctx = { tenant_id: tenantId, unit_id: unitId };
  const collName = collectionName(tenantId, unitId, entity);
  const db = getDb();
  const collection = db.collection(collName);

  // Ensure collections exist
  await ensureCollection(ctx, entity, entityDef);

  const embeddableFields = getEmbeddableFields(entityDef);
  if (embeddableFields.length > 0) {
    const tenantConfig = await configLoader.getTenant(tenantId);
    const globalConfig = getProviderConfig();
    const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);
    const [sampleVector] = await provider.embedTexts(['sample']);
    await ensureQdrantCollection(tenantId, entity, sampleVector.length);
  }

  // Get all documents
  const docs = await collection.find({}).toArray();
  let indexed = 0;

  for (const doc of docs) {
    try {
      const docId = String(doc._id);

      // Index in Typesense
      await upsertDocument(ctx, entity, {
        id: docId,
        ...doc,
      });

      // Index in Qdrant if has embeddable fields
      if (embeddableFields.length > 0) {
        const tenantConfig = await configLoader.getTenant(tenantId);
        const globalConfig = getProviderConfig();
        const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);

        const textToEmbed = concatFields(doc as Record<string, unknown>, embeddableFields);
        if (textToEmbed.trim()) {
          const [vector] = await provider.embedTexts([textToEmbed]);
          await upsertQdrantPoint(tenantId, entity, {
            id: docId,
            vector,
            payload: {
              tenant_id: tenantId,
              unit_id: unitId,
              ...doc,
            },
          });
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
