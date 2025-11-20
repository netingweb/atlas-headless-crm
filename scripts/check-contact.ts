#!/usr/bin/env tsx
/**
 * Script to check if a contact exists in the database
 * Usage: tsx scripts/check-contact.ts <contact_id> [tenant_id]
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function checkContact(contactId: string, tenantId = 'demo2') {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log(`Checking for contact with ID: ${contactId} in tenant: ${tenantId}\n`);

    // Check in global collection (tenant scope)
    const globalCollection = db.collection(`${tenantId}_contact`);
    const globalDoc = await globalCollection.findOne({
      _id: new ObjectId(contactId),
      tenant_id: tenantId,
    });

    if (globalDoc) {
      console.log('✅ Found in GLOBAL collection:', `${tenantId}_contact`);
      console.log('Document:', JSON.stringify(globalDoc, null, 2));
      return;
    }

    console.log('❌ Not found in global collection:', `${tenantId}_contact`);

    // Check in local collections (unit scope)
    const collections = await db.listCollections().toArray();
    const contactCollections = collections
      .map((c) => c.name)
      .filter((name) => name.startsWith(`${tenantId}_`) && name.endsWith('_contact'));

    console.log(`\nChecking ${contactCollections.length} local collections...\n`);

    for (const collName of contactCollections) {
      const coll = db.collection(collName);
      const doc = await coll.findOne({
        _id: new ObjectId(contactId),
        tenant_id: tenantId,
      });

      if (doc) {
        console.log(`✅ Found in LOCAL collection: ${collName}`);
        console.log('Document:', JSON.stringify(doc, null, 2));
        return;
      }
    }

    console.log('❌ Contact not found in any collection');
    console.log('\nChecked collections:');
    console.log(`  - ${tenantId}_contact (global)`);
    contactCollections.forEach((name) => console.log(`  - ${name} (local)`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

const contactId = process.argv[2];
const tenantId = process.argv[3] || 'demo2';

if (!contactId) {
  console.error('Usage: tsx scripts/check-contact.ts <contact_id> [tenant_id]');
  process.exit(1);
}

if (!ObjectId.isValid(contactId)) {
  console.error(`Invalid ObjectId format: ${contactId}`);
  process.exit(1);
}

checkContact(contactId, tenantId).catch(console.error);
