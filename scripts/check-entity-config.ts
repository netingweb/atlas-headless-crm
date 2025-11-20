#!/usr/bin/env tsx
/**
 * Script to check entity configuration in MongoDB
 * Usage: tsx scripts/check-entity-config.ts <entity_name> [tenant_id]
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function checkEntityConfig(entityName: string, tenantId = 'demo2') {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log(`Checking entity configuration for: ${entityName} in tenant: ${tenantId}\n`);

    const configDoc = await db.collection('entities_config').findOne({
      tenant_id: tenantId,
    });

    if (!configDoc) {
      console.log('❌ No entities config found for tenant:', tenantId);
      return;
    }

    const config = configDoc as {
      entities: Array<{ name: string; scope?: string; [key: string]: unknown }>;
    };
    const entity = config.entities.find((e) => e.name === entityName);

    if (!entity) {
      console.log(`❌ Entity ${entityName} not found in config`);
      console.log('\nAvailable entities:');
      config.entities.forEach((e) => {
        console.log(`  - ${e.name} (scope: ${e.scope || 'not set'})`);
      });
      return;
    }

    console.log(`✅ Found entity configuration:`);
    console.log(JSON.stringify(entity, null, 2));
    console.log(`\nScope: ${entity.scope || 'NOT SET (defaults to unit)'}`);
    console.log(`Is Global: ${entity.scope === 'tenant'}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

const entityName = process.argv[2];
const tenantId = process.argv[3] || 'demo2';

if (!entityName) {
  console.error('Usage: tsx scripts/check-entity-config.ts <entity_name> [tenant_id]');
  process.exit(1);
}

checkEntityConfig(entityName, tenantId).catch(console.error);
