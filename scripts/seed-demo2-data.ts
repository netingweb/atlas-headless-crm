import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

async function seedData(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  const units = [
    'milano_sales',
    'milano_service',
    'roma_sales',
    'roma_service',
    'torino_sales',
    'torino_service',
  ];
  const now = new Date();

  console.log(`\n📋 Creating test data for tenant: ${tenantId}\n`);

  // 1. Create global contacts (scope: tenant)
  console.log('📋 Creating global contacts (scope: tenant)...');
  const globalContactsCollection = `${tenantId}_contact`;
  const contactsCol = db.collection(globalContactsCollection);

  const globalContacts = [
    {
      tenant_id: tenantId,
      first_name: 'Marco',
      last_name: 'Rossi',
      name: 'Marco Rossi',
      email: 'marco.rossi@example.com',
      phone: '+39 348 1234567',
      contact_type: 'privato',
      contact_source: 'web',
      pipeline_stage: 'lead',
      created_by_unit: 'milano_sales',
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      first_name: 'Laura',
      last_name: 'Bianchi',
      name: 'Laura Bianchi',
      email: 'laura.bianchi@example.com',
      phone: '+39 348 2345678',
      contact_type: 'privato',
      contact_source: 'telefono',
      pipeline_stage: 'qualificato',
      created_by_unit: 'roma_sales',
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      first_name: 'Giuseppe',
      last_name: 'Verdi',
      name: 'Giuseppe Verdi',
      email: 'giuseppe.verdi@example.com',
      phone: '+39 348 3456789',
      contact_type: 'aziendale',
      contact_source: 'referral',
      pipeline_stage: 'lead',
      created_by_unit: 'torino_sales',
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
  ];

  for (const contact of globalContacts) {
    await contactsCol.insertOne(contact as any);
    console.log(
      `  ✅ Created contact: ${contact.first_name} ${contact.last_name} [created_by: ${contact.created_by_unit}]`
    );
  }

  // 2. Create local tasks (scope: unit)
  console.log('\n📋 Creating local tasks (scope: unit)...');
  const tasks = [
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      title: 'Follow-up con Marco Rossi',
      description: 'Chiamare per preventivo BMW Serie 3',
      task_type: 'follow_up',
      status: 'aperto',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      ownership: { owner_unit: 'milano_sales', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_sales',
      title: 'Qualifica lead Laura Bianchi',
      description: 'Verificare interesse per Mercedes GLC',
      task_type: 'qualifica',
      status: 'aperto',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      ownership: { owner_unit: 'roma_sales', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'milano_service',
      title: 'Tagliando BMW X5',
      description: 'Tagliando 30.000 km per BMW X5',
      task_type: 'manutenzione',
      status: 'aperto',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      ownership: { owner_unit: 'milano_service', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
  ];

  for (const task of tasks) {
    const taskCollName = `${tenantId}_${task.unit_id}_task`;
    const taskCol = db.collection(taskCollName);
    await taskCol.insertOne(task as any);
    console.log(`  ✅ Created task: ${task.title} in ${task.unit_id}`);
  }

  // 3. Create local deals (scope: unit)
  console.log('\n📋 Creating local deals (scope: unit)...');

  // Get some product IDs from the global collection
  const productsCol = db.collection(`${tenantId}_product`);
  const sampleProducts = await productsCol.find({}).limit(3).toArray();

  const deals = [
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      deal_number: 'DL-MIL-001',
      title: 'Vendita BMW Serie 3 a Marco Rossi',
      description: 'Trattativa per BMW Serie 3 320d',
      product_id: sampleProducts[0]?._id,
      contact_name: 'Marco Rossi',
      status: 'in_trattativa',
      amount: 45000,
      start_date: now,
      ownership: { owner_unit: 'milano_sales', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_sales',
      deal_number: 'DL-ROM-001',
      title: 'Vendita Mercedes GLC a Laura Bianchi',
      description: 'Trattativa per Mercedes GLC 300',
      product_id: sampleProducts[1]?._id,
      contact_name: 'Laura Bianchi',
      status: 'qualificato',
      amount: 42000,
      start_date: now,
      ownership: { owner_unit: 'roma_sales', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
  ];

  for (const deal of deals) {
    const dealCollName = `${tenantId}_${deal.unit_id}_deal`;
    const dealCol = db.collection(dealCollName);
    await dealCol.insertOne(deal as any);
    console.log(`  ✅ Created deal: ${deal.title} in ${deal.unit_id}`);
  }

  // 4. Create local notes (scope: unit)
  console.log('\n📋 Creating local notes (scope: unit)...');
  const notes = [
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      title: 'Nota su Marco Rossi',
      content: 'Cliente interessato a BMW, budget circa 45k, finanziamento richiesto',
      status: 'to do',
      expiration_date_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      ownership: { owner_unit: 'milano_sales', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_sales',
      title: 'Nota su Laura Bianchi',
      content: 'Cliente preferisce colore nero, test drive richiesto',
      status: 'to do',
      expiration_date_time: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      ownership: { owner_unit: 'roma_sales', visible_to: [] },
      visible_to: [],
      created_at: now,
      updated_at: now,
    },
  ];

  for (const note of notes) {
    const noteCollName = `${tenantId}_${note.unit_id}_note`;
    const noteCol = db.collection(noteCollName);
    await noteCol.insertOne(note as any);
    console.log(`  ✅ Created note: ${note.title} in ${note.unit_id}`);
  }

  console.log(`\n✅ Test data created successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Global entities (visible to all units):`);
  console.log(`     - ${globalContacts.length} contacts in ${globalContactsCollection}`);
  console.log(`     - 26 products in ${tenantId}_product`);
  console.log(`   Local entities (unit-specific):`);
  console.log(`     - ${tasks.length} tasks across units`);
  console.log(`     - ${deals.length} deals across units`);
  console.log(`     - ${notes.length} notes across units`);

  await client.close();
}

seedData().catch((error) => {
  console.error('Failed to seed data:', error);
  process.exit(1);
});
