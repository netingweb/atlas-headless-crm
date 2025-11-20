import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { getDb } from '@crm-atlas/db';
import { collectionName } from '@crm-atlas/utils';
import { getTypesenseClient, ensureCollection, upsertDocument } from '@crm-atlas/search';
import type { EntityDefinition } from '@crm-atlas/types';
import { MongoConfigLoader } from '@crm-atlas/config';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

// Entities that should be global
const globalEntities = ['product', 'company', 'contact'];

interface MigrationStats {
  entity: string;
  localCollections: string[];
  globalCollection: string;
  documentsMigrated: number;
  documentsSkipped: number;
  errors: string[];
}

async function migrateGlobalEntities(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const configLoader = new MongoConfigLoader(db);
  const typesenseClient = getTypesenseClient();

  console.log(`\n🔄 Starting migration of global entities for tenant: ${tenantId}\n`);

  // Get entity definitions
  const entities = await configLoader.getEntities({ tenant_id: tenantId, unit_id: 'milano_sales' });
  const entityMap = new Map<string, EntityDefinition>();
  for (const entity of entities) {
    entityMap.set(entity.name, entity);
  }

  const stats: MigrationStats[] = [];

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

    // Global collection name should be {tenant_id}_{entity} (without null)
    const globalCollectionName = `${tenantId}_${entityName}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    const stat: MigrationStats = {
      entity: entityName,
      localCollections: [],
      globalCollection: globalCollectionName,
      documentsMigrated: 0,
      documentsSkipped: 0,
      errors: [],
    };

    // Find all local collections for this entity
    // Include both unit-specific collections (demo2_unit_entity) and incorrectly named global collections (demo2_null_entity)
    const allCollections = await db.listCollections().toArray();
    const localCollectionPattern = new RegExp(`^${tenantId}_(.+)_${entityName}$`);
    const incorrectGlobalPattern = new RegExp(`^${tenantId}_null_${entityName}$`);

    for (const collInfo of allCollections) {
      const collName = collInfo.name;
      // Include unit-specific collections
      const match = collName.match(localCollectionPattern);
      if (match && match[1] !== 'null') {
        stat.localCollections.push(collName);
      }
      // Also include incorrectly named global collections
      if (collName.match(incorrectGlobalPattern)) {
        stat.localCollections.push(collName);
      }
    }

    console.log(`   Found ${stat.localCollections.length} local collections:`);
    for (const localColl of stat.localCollections) {
      const count = await db.collection(localColl).countDocuments();
      console.log(`     - ${localColl}: ${count} documents`);
    }

    // Get or create global collection
    const globalColl = db.collection(stat.globalCollection);
    const globalCount = await globalColl.countDocuments();
    console.log(`   Global collection: ${stat.globalCollection} (${globalCount} documents)`);

    // Migrate documents from local collections to global collection
    for (const localCollName of stat.localCollections) {
      const localColl = db.collection(localCollName);
      const localDocs = await localColl.find({}).toArray();

      console.log(`   Migrating ${localDocs.length} documents from ${localCollName}...`);

      for (const doc of localDocs) {
        try {
          // Remove unit_id for global entities
          const { unit_id, ...docWithoutUnit } = doc;

          // Check if document already exists in global collection (by _id or by unique fields)
          const existingDoc = await globalColl.findOne({ _id: doc._id });

          if (existingDoc) {
            console.log(
              `     ⚠️  Document ${doc._id} already exists in global collection, skipping...`
            );
            stat.documentsSkipped++;
            continue;
          }

          // Insert into global collection
          await globalColl.insertOne(docWithoutUnit);
          stat.documentsMigrated++;

          // Update Typesense
          try {
            // Ensure global Typesense collection exists
            const ctx = { tenant_id: tenantId, unit_id: 'milano_sales' }; // unit_id not used for global entities
            await ensureCollection(ctx, entityName, entityDef);

            const typesenseDoc: Record<string, unknown> = {
              id: String(doc._id),
              ...docWithoutUnit,
              tenant_id: tenantId,
            };
            delete typesenseDoc._id;

            // Delete from local Typesense collection
            const localTypesenseColl = collectionName(
              tenantId,
              localCollName.split('_')[1],
              entityName,
              false
            );
            try {
              await typesenseClient
                .collections(localTypesenseColl)
                .documents(String(doc._id))
                .delete();
            } catch (error) {
              // Collection might not exist or document already deleted, ignore
            }

            // Upsert to global Typesense collection
            await upsertDocument(ctx, entityName, typesenseDoc, entityDef);
          } catch (error) {
            console.warn(
              `     ⚠️  Failed to update Typesense for document ${doc._id}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        } catch (error) {
          const errorMsg = `Failed to migrate document ${doc._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`     ❌ ${errorMsg}`);
          stat.errors.push(errorMsg);
        }
      }

      // After migration, optionally delete local collection (commented out for safety)
      // console.log(`   ⚠️  Local collection ${localCollName} can be deleted after verification`);
    }

    stats.push(stat);
  }

  // Print summary
  console.log(`\n\n📊 Migration Summary:\n`);
  for (const stat of stats) {
    console.log(`Entity: ${stat.entity}`);
    console.log(`  Global Collection: ${stat.globalCollection}`);
    console.log(`  Local Collections: ${stat.localCollections.length}`);
    console.log(`  Documents Migrated: ${stat.documentsMigrated}`);
    console.log(`  Documents Skipped: ${stat.documentsSkipped}`);
    console.log(`  Errors: ${stat.errors.length}`);
    if (stat.errors.length > 0) {
      console.log(`  Error Details:`);
      stat.errors.forEach((err) => console.log(`    - ${err}`));
    }
    console.log('');
  }

  await client.close();
}

migrateGlobalEntities().catch((error) => {
  console.error('Failed to migrate global entities:', error);
  process.exit(1);
});
