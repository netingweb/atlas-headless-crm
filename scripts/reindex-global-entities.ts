import { loadRootEnv, collectionName } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { getDb } from '@crm-atlas/db';
import { ensureCollection, upsertDocument } from '@crm-atlas/search';
import type { EntityDefinition } from '@crm-atlas/types';
import { MongoConfigLoader } from '@crm-atlas/config';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

// Entities that are global
const globalEntities = ['product', 'company', 'contact'];

async function reindexGlobalEntities(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const configLoader = new MongoConfigLoader(db);

  console.log(`\n🔄 Re-indexing global entities for tenant: ${tenantId}\n`);

  // Get entity definitions
  const entities = await configLoader.getEntities({ tenant_id: tenantId, unit_id: 'milano_sales' });
  const entityMap = new Map<string, EntityDefinition>();
  for (const entity of entities) {
    entityMap.set(entity.name, entity);
  }

  for (const entityName of globalEntities) {
    const entityDef = entityMap.get(entityName);
    if (!entityDef) {
      console.log(`⚠️  Entity ${entityName} not found in config, skipping...`);
      continue;
    }

    if (entityDef.scope !== 'tenant') {
      console.log(
        `⚠️  Entity ${entityName} is not configured as global (scope: ${entityDef.scope}), skipping...`
      );
      continue;
    }

    console.log(`\n📦 Re-indexing entity: ${entityName}`);

    // Get global collection
    const mongoCollectionName = `${tenantId}_${entityName}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const globalColl = db.collection(mongoCollectionName);
    const docs = await globalColl.find({}).toArray();

    console.log(`   Found ${docs.length} documents in global collection`);

    if (docs.length === 0) {
      console.log(`   ⚠️  No documents to index`);
      continue;
    }

    // Ensure Typesense collection exists with correct schema
    const ctx = { tenant_id: tenantId, unit_id: 'milano_sales' }; // unit_id not used for global entities
    // Delete existing collection if it exists (to recreate with correct schema)
    const { getTypesenseClient } = await import('@crm-atlas/search');
    const typesenseClient = getTypesenseClient();
    const typesenseCollectionName = collectionName(tenantId, null, entityName, true);
    try {
      await typesenseClient.collections(typesenseCollectionName).delete();
      console.log(`   ✅ Deleted existing Typesense collection: ${typesenseCollectionName}`);
    } catch {
      // Collection doesn't exist, that's fine
    }
    // Recreate with correct schema
    await ensureCollection(ctx, entityName, entityDef);

    // Re-index each document
    let indexed = 0;
    for (const doc of docs) {
      try {
        const typesenseDoc: Record<string, unknown> = {
          id: String(doc._id),
          ...doc,
          tenant_id: tenantId,
        };
        delete typesenseDoc._id;
        delete typesenseDoc.unit_id; // Remove unit_id for global entities

        // Convert dates to timestamps (int64)
        if (typesenseDoc.created_at instanceof Date) {
          typesenseDoc.created_at = Math.floor(typesenseDoc.created_at.getTime() / 1000);
        }
        if (typesenseDoc.updated_at instanceof Date) {
          typesenseDoc.updated_at = Math.floor(typesenseDoc.updated_at.getTime() / 1000);
        }

        // Use correct collection name for global entities
        const { getTypesenseClient } = await import('@crm-atlas/search');
        const tsClient = getTypesenseClient();
        const correctCollName = `${tenantId}_${entityName}`
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_');
        await tsClient.collections(correctCollName).documents().upsert(typesenseDoc, {
          dirty_values: 'coerce_or_drop',
        });
        indexed++;
      } catch (error) {
        console.error(
          `   ❌ Failed to index document ${doc._id}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log(`   ✅ Indexed ${indexed}/${docs.length} documents in Typesense`);
  }

  console.log(`\n✅ Re-indexing completed\n`);
  await client.close();
}

reindexGlobalEntities().catch((error) => {
  console.error('Failed to re-index global entities:', error);
  process.exit(1);
});
