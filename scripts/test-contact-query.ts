#!/usr/bin/env tsx
/**
 * Script to test the exact query used by findById
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function testQuery() {
  const client = new MongoClient(MONGODB_URI);
  const contactId = '691ec8ef6aa14c982ed706a9';
  const tenantId = 'demo2';
  const unitId = 'milano_sales';

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('Testing queries for contact:', contactId);
    console.log('Tenant:', tenantId, 'Unit:', unitId, '\n');

    const collection = db.collection('demo2_contact');

    // Test 1: Query as global entity (no unit_id filter)
    console.log('Test 1: Query as global entity (no unit_id filter)');
    const filter1 = { _id: new ObjectId(contactId), tenant_id: tenantId };
    console.log('Filter:', JSON.stringify(filter1, null, 2));
    const doc1 = await collection.findOne(filter1);
    console.log('Result:', doc1 ? '✅ FOUND' : '❌ NOT FOUND');
    if (doc1) {
      console.log('Document unit_id:', doc1.unit_id);
      console.log('Document tenant_id:', doc1.tenant_id);
    }
    console.log('');

    // Test 2: Query as local entity (with unit_id filter)
    console.log('Test 2: Query as local entity (with unit_id filter)');
    const filter2 = { _id: new ObjectId(contactId), tenant_id: tenantId, unit_id: unitId };
    console.log('Filter:', JSON.stringify(filter2, null, 2));
    const doc2 = await collection.findOne(filter2);
    console.log('Result:', doc2 ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('');

    // Test 3: Query with $or for unit_id null/undefined
    console.log('Test 3: Query with $or for unit_id null/undefined');
    const filter3 = {
      _id: new ObjectId(contactId),
      tenant_id: tenantId,
      $or: [{ unit_id: { $exists: false } }, { unit_id: null }],
    };
    console.log('Filter:', JSON.stringify(filter3, null, 2));
    const doc3 = await collection.findOne(filter3);
    console.log('Result:', doc3 ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('');

    // Test 4: Simple query with just _id and tenant_id
    console.log('Test 4: Simple query (just _id and tenant_id)');
    const filter4 = { _id: new ObjectId(contactId), tenant_id: tenantId };
    console.log('Filter:', JSON.stringify(filter4, null, 2));
    const doc4 = await collection.findOne(filter4);
    console.log('Result:', doc4 ? '✅ FOUND' : '❌ NOT FOUND');
    if (doc4) {
      console.log('Full document keys:', Object.keys(doc4));
      console.log('Has unit_id:', 'unit_id' in doc4);
      if ('unit_id' in doc4) {
        console.log('unit_id value:', doc4.unit_id);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testQuery().catch(console.error);
