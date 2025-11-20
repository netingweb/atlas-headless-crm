import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { getTypesenseClient } from '@crm-atlas/search';
import { collectionName } from '@crm-atlas/utils';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

// Entities that are now global
const globalEntities = ['product', 'company', 'contact'];

async function cleanupLocalCollections(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const typesenseClient = getTypesenseClient();

  console.log(`\n🧹 Cleaning up local collections for global entities in tenant: ${tenantId}\n`);

  for (const entityName of globalEntities) {
    console.log(`\n📦 Processing entity: ${entityName}`);

    // Find all local collections for this entity
    const allCollections = await db.listCollections().toArray();
    const localCollectionPattern = new RegExp(`^${tenantId}_(.+)_${entityName}$`);
    const incorrectGlobalPattern = new RegExp(`^${tenantId}_null_${entityName}$`);

    const localCollections: string[] = [];
    for (const collInfo of allCollections) {
      const collName = collInfo.name;
      const match = collName.match(localCollectionPattern);
      if (match && match[1] !== 'null') {
        localCollections.push(collName);
      }
      if (collName.match(incorrectGlobalPattern)) {
        localCollections.push(collName);
      }
    }

    if (localCollections.length === 0) {
      console.log(`   ✅ No local collections to clean up`);
      continue;
    }

    console.log(`   Found ${localCollections.length} local collections to clean up:`);
    for (const localColl of localCollections) {
      const count = await db.collection(localColl).countDocuments();
      console.log(`     - ${localColl}: ${count} documents`);
    }

    // Verify global collection exists and has documents
    const globalCollectionName = `${tenantId}_${entityName}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const globalColl = db.collection(globalCollectionName);
    const globalCount = await globalColl.countDocuments();
    console.log(`   Global collection: ${globalCollectionName} (${globalCount} documents)`);

    if (globalCount === 0) {
      console.log(`   ⚠️  Global collection is empty, skipping cleanup`);
      continue;
    }

    // Delete local MongoDB collections
    for (const localCollName of localCollections) {
      try {
        await db.collection(localCollName).drop();
        console.log(`   ✅ Deleted MongoDB collection: ${localCollName}`);
      } catch (error) {
        console.error(`   ❌ Failed to delete MongoDB collection ${localCollName}:`, error);
      }
    }

    // Delete local Typesense collections
    for (const localCollName of localCollections) {
      try {
        // Extract unit_id from collection name
        const match = localCollName.match(new RegExp(`^${tenantId}_(.+)_${entityName}$`));
        if (match) {
          const unitId = match[1];
          if (unitId !== 'null') {
            const localTypesenseColl = collectionName(tenantId, unitId, entityName, false);
            try {
              await typesenseClient.collections(localTypesenseColl).delete();
              console.log(`   ✅ Deleted Typesense collection: ${localTypesenseColl}`);
            } catch (error) {
              // Collection might not exist, ignore
              console.log(
                `   ℹ️  Typesense collection ${localTypesenseColl} does not exist or already deleted`
              );
            }
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to delete Typesense collection for ${localCollName}:`, error);
      }
    }
  }

  console.log(`\n✅ Cleanup completed\n`);
  await client.close();
}

cleanupLocalCollections().catch((error) => {
  console.error('Failed to cleanup local collections:', error);
  process.exit(1);
});
