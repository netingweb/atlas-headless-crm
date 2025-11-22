import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient, ObjectId } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo';
const units = ['sales', 'support'];
const now = new Date();

// Sample data generators
const firstNames = [
  'Marco',
  'Laura',
  'Giuseppe',
  'Anna',
  'Luca',
  'Sara',
  'Francesco',
  'Elena',
  'Andrea',
  'Chiara',
  'Roberto',
  'Valentina',
  'Alessandro',
  'Martina',
  'Matteo',
  'Giulia',
  'Davide',
  'Federica',
  'Stefano',
  'Silvia',
];
const lastNames = [
  'Rossi',
  'Bianchi',
  'Verdi',
  'Ferrari',
  'Romano',
  'Colombo',
  'Ricci',
  'Marino',
  'Greco',
  'Bruno',
  'Gallo',
  'Costa',
  'Fontana',
  'Caruso',
  'Mancini',
  'Rizzo',
  'Lombardi',
  'Moretti',
  'Barbieri',
  'Ferraro',
];
const companyNames = [
  'Tech Solutions SRL',
  'Digital Marketing Pro',
  'Web Development Hub',
  'Cloud Services Italia',
  'Software Innovation',
  'Data Analytics Co',
  'Creative Agency',
  'IT Consulting Group',
  'E-commerce Solutions',
  'Mobile Apps Studio',
  'Cybersecurity Experts',
  'AI Development Lab',
  'Blockchain Services',
  'DevOps Solutions',
  'UX Design Studio',
  'Content Marketing Pro',
  'SEO Optimization Co',
  'Social Media Agency',
  'Brand Strategy',
  'Growth Hacking Lab',
];
const industries = [
  'Technology',
  'Marketing',
  'Consulting',
  'E-commerce',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Hospitality',
  'Transportation',
  'Energy',
  'Media',
];
const sources = ['web', 'referral', 'email', 'phone', 'social', 'event', 'partner', 'advertising'];
const statuses = ['new', 'pre_qualification', 'qualified', 'customer', 'win', 'lost'];
const labels = ['vip', 'prospect', 'customer', 'partner', 'supplier'];
const taskTypes = [
  'call',
  'meeting',
  'email',
  'follow_up',
  'proposal',
  'demo',
  'negotiation',
  'closing',
];
const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
const opportunityStages = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];
const noteStatuses = ['to do', 'pending', 'on going', 'done', 'canceled', 'archived'];
const productCategories = [
  'webmarketing',
  'development',
  'consulting',
  'design',
  'automation',
  'training',
  'support',
];
const documentTypes = ['contract', 'proposal', 'invoice', 'report', 'presentation', 'other'];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedData(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  console.log(`\n📋 Creating test data for tenant: ${tenantId}\n`);

  // 1. Create companies (global scope)
  console.log('📋 Creating companies (scope: tenant)...');
  const companiesCol = db.collection(`${tenantId}_company`);
  const companies: any[] = [];

  for (let i = 0; i < 12; i++) {
    const company = {
      tenant_id: tenantId,
      name: companyNames[i],
      email: `info@${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `+39 02 ${Math.floor(1000000 + Math.random() * 9000000)}`,
      phone2:
        Math.random() > 0.5 ? `+39 02 ${Math.floor(1000000 + Math.random() * 9000000)}` : undefined,
      website: `https://www.${companyNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
      size: randomElement(['small', 'medium', 'large', 'enterprise']),
      industry: randomElement(industries),
      address: `Via ${randomElement(['Roma', 'Milano', 'Napoli', 'Torino', 'Firenze'])} ${Math.floor(1 + Math.random() * 200)}, ${randomElement(['Milano', 'Roma', 'Torino', 'Firenze', 'Napoli'])}`,
      created_at: randomDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), now),
      updated_at: now,
    };
    companies.push(company);
  }

  const companyResults = await companiesCol.insertMany(companies);
  const companyIds = Object.values(companyResults.insertedIds);
  console.log(`  ✅ Created ${companies.length} companies`);

  // 2. Create contacts (global scope)
  console.log('\n📋 Creating contacts (scope: tenant)...');
  const contactsCol = db.collection(`${tenantId}_contact`);
  const contacts: any[] = [];

  for (let i = 0; i < 12; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const contact = {
      tenant_id: tenantId,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `+39 348 ${Math.floor(1000000 + Math.random() * 9000000)}`,
      source: randomElement(sources),
      role: randomElement([
        'CEO',
        'CTO',
        'CFO',
        'CMO',
        'Manager',
        'Director',
        'Developer',
        'Designer',
        'Sales',
        'Marketing',
      ]),
      status: randomElement(statuses),
      labels: randomElements(labels, Math.floor(Math.random() * 3) + 1),
      company_id: randomElement(companyIds).toString(),
      created_at: randomDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), now),
      updated_at: now,
    };
    contacts.push(contact);
  }

  const contactResults = await contactsCol.insertMany(contacts);
  const contactIds = Object.values(contactResults.insertedIds);
  console.log(`  ✅ Created ${contacts.length} contacts`);

  // 3. Create products (global scope)
  console.log('\n📋 Creating products (scope: tenant)...');
  const productsCol = db.collection(`${tenantId}_product`);
  const products: any[] = [];

  const productNames = [
    'Website Development',
    'Mobile App Development',
    'SEO Optimization',
    'Social Media Management',
    'Content Marketing',
    'Email Marketing',
    'PPC Advertising',
    'Brand Identity Design',
    'UI/UX Design',
    'E-commerce Platform',
    'CRM Implementation',
    'Marketing Automation',
    'Business Consulting',
    'Technical Support',
    'Training Program',
  ];

  for (let i = 0; i < 12; i++) {
    const product = {
      tenant_id: tenantId,
      name: productNames[i] || `Product ${i + 1}`,
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      description: `Professional ${productNames[i] || `Product ${i + 1}`} service with comprehensive features and support.`,
      price: Math.floor(500 + Math.random() * 10000),
      category: randomElement(productCategories),
      created_at: randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
      updated_at: now,
    };
    products.push(product);
  }

  const productResults = await productsCol.insertMany(products);
  const productIds = Object.values(productResults.insertedIds);
  console.log(`  ✅ Created ${products.length} products`);

  // 4. Create opportunities (global scope)
  console.log('\n📋 Creating opportunities (scope: tenant)...');
  const opportunitiesCol = db.collection(`${tenantId}_opportunity`);
  const opportunities: any[] = [];

  for (let i = 0; i < 12; i++) {
    const opportunity = {
      tenant_id: tenantId,
      title: `Opportunity ${i + 1}: ${randomElement(products).name}`,
      value: Math.floor(1000 + Math.random() * 50000),
      stage: randomElement(opportunityStages),
      description: `Great opportunity to work with ${randomElement(companies).name} on ${randomElement(products).name}.`,
      company_id: randomElement(companyIds).toString(),
      contact_id: randomElement(contactIds).toString(),
      created_at: randomDate(new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), now),
      updated_at: now,
    };
    opportunities.push(opportunity);
  }

  await opportunitiesCol.insertMany(opportunities);
  console.log(`  ✅ Created ${opportunities.length} opportunities`);

  // 5. Create tasks (unit scope)
  console.log('\n📋 Creating tasks (scope: unit)...');
  let taskCount = 0;

  for (const unitId of units) {
    const tasksCol = db.collection(`${tenantId}_${unitId}_task`);
    const tasks: any[] = [];

    for (let i = 0; i < 6; i++) {
      const task = {
        tenant_id: tenantId,
        unit_id: unitId,
        title: `${randomElement(taskTypes).replace('_', ' ')} - ${randomElement(contacts).name}`,
        description: `Task description for ${randomElement(taskTypes)} with ${randomElement(contacts).name}.`,
        type: randomElement(taskTypes),
        status: randomElement(taskStatuses),
        due_date: randomDate(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
        company_id: randomElement(companyIds).toString(),
        contact_id: randomElement(contactIds).toString(),
        created_at: randomDate(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), now),
        updated_at: now,
      };
      tasks.push(task);
    }

    await tasksCol.insertMany(tasks);
    taskCount += tasks.length;
    console.log(`  ✅ Created ${tasks.length} tasks in unit: ${unitId}`);
  }

  // 6. Create notes (global scope)
  console.log('\n📋 Creating notes (scope: tenant)...');
  const notesCol = db.collection(`${tenantId}_note`);
  const notes: any[] = [];

  const noteTitles = [
    'Meeting Notes',
    'Follow-up Discussion',
    'Client Requirements',
    'Project Update',
    'Budget Review',
    'Timeline Discussion',
    'Feature Request',
    'Feedback Session',
    'Status Update',
    'Next Steps',
    'Action Items',
    'Important Information',
  ];

  for (let i = 0; i < 12; i++) {
    const note = {
      tenant_id: tenantId,
      title: noteTitles[i] || `Note ${i + 1}`,
      content: `Detailed notes about ${randomElement(contacts).name} from ${randomElement(companies).name}. Discussion covered important topics and next steps.`,
      status: randomElement(noteStatuses),
      expiration_date_time: randomDate(now, new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
      company_id: randomElement(companyIds).toString(),
      contact_id: randomElement(contactIds).toString(),
      created_at: randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
      updated_at: now,
    };
    notes.push(note);
  }

  await notesCol.insertMany(notes);
  console.log(`  ✅ Created ${notes.length} notes`);

  // 7. Create documents (global scope)
  console.log('\n📋 Creating documents (scope: tenant)...');
  const documentsCol = db.collection(`${tenantId}_document`);
  const documents: any[] = [];

  const documentTitles = [
    'Contract Agreement',
    'Proposal Document',
    'Invoice 2024',
    'Project Report',
    'Presentation Deck',
    'Technical Specification',
    'Meeting Minutes',
    'Budget Plan',
    'Marketing Plan',
    'Product Brochure',
    'Service Agreement',
    'Annual Report',
  ];

  for (let i = 0; i < 12; i++) {
    const docType = randomElement(documentTypes);
    const document = {
      tenant_id: tenantId,
      title: documentTitles[i] || `Document ${i + 1}`,
      filename: `${documentTitles[i]?.toLowerCase().replace(/\s+/g, '_') || `document_${i + 1}`}.pdf`,
      mime_type: randomElement([
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
      ]),
      file_size: Math.floor(100000 + Math.random() * 5000000),
      storage_path: `documents/${tenantId}/${randomElement(companyIds).toString()}/${documentTitles[i]?.toLowerCase().replace(/\s+/g, '_') || `document_${i + 1}`}.pdf`,
      document_type: docType,
      related_entity_type: randomElement(['company', 'contact', 'opportunity']),
      related_entity_id: randomElement([...companyIds, ...contactIds]).toString(),
      processing_status: randomElement(['pending', 'processing', 'completed', 'failed']),
      extracted_content:
        docType === 'contract'
          ? 'Contract terms and conditions...'
          : `Document content for ${documentTitles[i]}`,
      metadata: { author: randomElement(contacts).name, version: '1.0' },
      created_at: randomDate(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), now),
      updated_at: now,
    };
    documents.push(document);
  }

  await documentsCol.insertMany(documents);
  console.log(`  ✅ Created ${documents.length} documents`);

  console.log(`\n✅ Test data created successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Global entities (scope: tenant):`);
  console.log(`     - ${companies.length} companies`);
  console.log(`     - ${contacts.length} contacts`);
  console.log(`     - ${products.length} products`);
  console.log(`     - ${opportunities.length} opportunities`);
  console.log(`     - ${notes.length} notes`);
  console.log(`     - ${documents.length} documents`);
  console.log(`   Local entities (scope: unit):`);
  console.log(`     - ${taskCount} tasks across ${units.length} units`);

  await client.close();
}

seedData().catch((error) => {
  console.error('Failed to seed data:', error);
  process.exit(1);
});
