import { loadRootEnv } from '@crm-atlas/utils';
import { getTypesenseClient, ensureCollection } from '@crm-atlas/search';
import { MongoClient } from 'mongodb';
import { MongoConfigLoader } from '@crm-atlas/config';
import { collectionName } from '@crm-atlas/utils';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

// Entities that are global
const globalEntities = ['product', 'company', 'contact'];

async function recreateGlobalTypesenseCollections(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const configLoader = new MongoConfigLoader(db);
  const typesenseClient = getTypesenseClient();

  console.log(`\n🔄 Recreating global Typesense collections for tenant: ${tenantId}\n`);

  // Get entity definitions
  const entities = await configLoader.getEntities({ tenant_id: tenantId, unit_id: 'milano_sales' });
  const entityMap = new Map(entities.map((e) => [e.name, e]));

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

    console.log(`\n📦 Processing entity: ${entityName}`);

    // Get global collection name (should be {tenant_id}_{entity} without null)
    const globalCollectionName = `${tenantId}_${entityName}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    // Delete existing collection if it exists
    try {
      await typesenseClient.collections(globalCollectionName).delete();
      console.log(`   ✅ Deleted existing Typesense collection: ${globalCollectionName}`);
    } catch (error) {
      console.log(`   ℹ️  Collection ${globalCollectionName} does not exist or already deleted`);
    }

    // Recreate collection with correct schema
    const ctx = { tenant_id: tenantId, unit_id: 'milano_sales' }; // unit_id not used for global entities
    await ensureCollection(ctx, entityName, entityDef);
    console.log(`   ✅ Created Typesense collection: ${globalCollectionName}`);
  }

  console.log(`\n✅ Recreating completed\n`);
  console.log(`📝 Now run: pnpm tsx scripts/reindex-global-entities.ts\n`);
  await client.close();
}

recreateGlobalTypesenseCollections().catch((error) => {
  console.error('Failed to recreate global Typesense collections:', error);
  process.exit(1);
});
