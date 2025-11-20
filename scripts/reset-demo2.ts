import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { getTypesenseClient } from '@crm-atlas/search';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

async function resetDemo2(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const typesenseClient = getTypesenseClient();

  console.log(`\n🧹 Resetting tenant: ${tenantId}\n`);

  // 1. Delete all MongoDB collections for demo2
  console.log('📋 Step 1: Deleting MongoDB collections...');
  const allCollections = await db.listCollections().toArray();
  const demo2Collections = allCollections.filter((c) => c.name.startsWith(`${tenantId}_`));

  let mongoDeleted = 0;
  for (const coll of demo2Collections) {
    try {
      await db.collection(coll.name).drop();
      console.log(`   ✅ Deleted: ${coll.name}`);
      mongoDeleted++;
    } catch (error) {
      console.error(`   ❌ Failed to delete ${coll.name}:`, error);
    }
  }
  console.log(`   📊 Total MongoDB collections deleted: ${mongoDeleted}`);

  // 2. Delete all Typesense collections for demo2
  console.log('\n📋 Step 2: Deleting Typesense collections...');
  try {
    const allTypesenseCollections = await typesenseClient.collections().retrieve();
    const demo2TypesenseCollections = allTypesenseCollections.filter((c: any) =>
      c.name.startsWith(`${tenantId}_`)
    );

    let typesenseDeleted = 0;
    for (const coll of demo2TypesenseCollections) {
      try {
        await typesenseClient.collections(coll.name).delete();
        console.log(`   ✅ Deleted: ${coll.name}`);
        typesenseDeleted++;
      } catch (error) {
        console.error(`   ❌ Failed to delete ${coll.name}:`, error);
      }
    }
    console.log(`   📊 Total Typesense collections deleted: ${typesenseDeleted}`);
  } catch (error) {
    console.error('   ❌ Failed to retrieve Typesense collections:', error);
  }

  // 3. Delete tenant config, units, entities, permissions, etc.
  console.log('\n📋 Step 3: Deleting tenant configuration from MongoDB...');
  const configCollections = [
    'tenant_config',
    'units',
    'entity_definitions',
    'permissions',
    'dictionaries',
    'sharing_policies',
    'workflows',
    'mcp_tools',
    'document_types',
    'users',
  ];

  for (const collName of configCollections) {
    try {
      const result = await db.collection(collName).deleteMany({ tenant_id: tenantId });
      if (result.deletedCount > 0) {
        console.log(`   ✅ Deleted ${result.deletedCount} document(s) from ${collName}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to delete from ${collName}:`, error);
    }
  }

  console.log(`\n✅ Reset completed for tenant: ${tenantId}\n`);
  console.log(`📝 Next steps:`);
  console.log(`   1. Run: pnpm config:sync demo2`);
  console.log(`   2. Run: pnpm tsx scripts/seed-demo2-users.ts`);
  console.log(`   3. Run: pnpm tsx scripts/seed-demo2-products.ts\n`);

  await client.close();
}

resetDemo2().catch((error) => {
  console.error('Failed to reset demo2:', error);
  process.exit(1);
});
