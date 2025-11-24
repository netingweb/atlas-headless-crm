import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient, ObjectId } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo3';
const units = ['ecommerce', 'retail', 'wholesale', 'customer_service'];
const now = new Date();

// Helper functions
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to convert date string (YYYY-MM-DD) to datetime ISO format
function dateToDateTime(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00.000Z').toISOString();
}

// Helper to convert Date object to datetime ISO format
function dateObjToDateTime(date: Date): string {
  return date.toISOString();
}

async function seedData(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  console.log(`\n📋 Creating test data for tenant: ${tenantId}\n`);

  // 1. Create Stores (global scope)
  console.log('📋 Creating stores (scope: tenant)...');
  const storesCol = db.collection(`${tenantId}_store`);
  const stores = [
    {
      tenant_id: tenantId,
      name: 'Milano Flagship Store',
      code: 'STORE-MIL-001',
      type: 'flagship',
      address: 'Via della Spiga, 15',
      city: 'Milano',
      country: 'Italia',
      phone: '+39 02 1234567',
      email: 'milano@pinupstars.com',
      manager: 'Giulia Ferrari',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Roma Retail Store',
      code: 'STORE-ROM-001',
      type: 'retail',
      address: 'Via del Corso, 123',
      city: 'Roma',
      country: 'Italia',
      phone: '+39 06 2345678',
      email: 'roma@pinupstars.com',
      manager: 'Marco Bianchi',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Firenze Outlet Store',
      code: 'STORE-FIR-001',
      type: 'outlet',
      address: 'Via dei Calzaiuoli, 45',
      city: 'Firenze',
      country: 'Italia',
      phone: '+39 055 3456789',
      email: 'firenze@pinupstars.com',
      manager: 'Sara Rossi',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const storeIds: Record<string, ObjectId> = {};
  for (const store of stores) {
    const result = await storesCol.insertOne(store as any);
    storeIds[store.code] = result.insertedId;
    console.log(`  ✅ Created store: ${store.name}`);
  }

  // 2. Create Warehouses (global scope)
  console.log('\n📋 Creating warehouses (scope: tenant)...');
  const warehousesCol = db.collection(`${tenantId}_warehouse`);
  const warehouses = [
    {
      tenant_id: tenantId,
      name: 'Magazzino Centrale Bologna',
      code: 'WH-BO-001',
      type: 'manufacturer',
      address: 'Via Seragnoli, 7',
      city: 'Bologna',
      country: 'Italia',
      postal_code: '40138',
      phone: '+39 051 6032311',
      email: 'warehouse@pinupstars.com',
      manager: 'Luca Verdi',
      is_active: true,
      notes: 'Magazzino principale presso sede produttore',
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Magazzino Milano Store',
      code: 'WH-MIL-001',
      type: 'store',
      store_id: storeIds['STORE-MIL-001'],
      address: 'Via della Spiga, 15',
      city: 'Milano',
      country: 'Italia',
      postal_code: '20121',
      phone: '+39 02 1234567',
      email: 'warehouse.milano@pinupstars.com',
      manager: 'Giulia Ferrari',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Magazzino Roma Store',
      code: 'WH-ROM-001',
      type: 'store',
      store_id: storeIds['STORE-ROM-001'],
      address: 'Via del Corso, 123',
      city: 'Roma',
      country: 'Italia',
      postal_code: '00186',
      phone: '+39 06 2345678',
      email: 'warehouse.roma@pinupstars.com',
      manager: 'Marco Bianchi',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Magazzino Firenze Store',
      code: 'WH-FIR-001',
      type: 'store',
      store_id: storeIds['STORE-FIR-001'],
      address: 'Via dei Calzaiuoli, 45',
      city: 'Firenze',
      country: 'Italia',
      postal_code: '50122',
      phone: '+39 055 3456789',
      email: 'warehouse.firenze@pinupstars.com',
      manager: 'Sara Rossi',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Centro Distribuzione Nord',
      code: 'WH-DC-001',
      type: 'distribution_center',
      address: 'Via Industriale, 100',
      city: 'Bologna',
      country: 'Italia',
      postal_code: '40128',
      phone: '+39 051 7890123',
      email: 'distribution@pinupstars.com',
      manager: 'Andrea Neri',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const warehouseIds: Record<string, ObjectId> = {};
  for (const warehouse of warehouses) {
    const result = await warehousesCol.insertOne(warehouse as any);
    warehouseIds[warehouse.code] = result.insertedId;
    console.log(`  ✅ Created warehouse: ${warehouse.name}`);
  }

  // 3. Create Resellers (global scope)
  console.log('\n📋 Creating resellers (scope: tenant)...');
  const resellersCol = db.collection(`${tenantId}_reseller`);
  const resellers = [
    {
      tenant_id: tenantId,
      name: 'Beach Fashion Store',
      code: 'RES-001',
      type: 'mono_brand',
      address: 'Via del Mare, 10',
      city: 'Rimini',
      country: 'Italia',
      phone: '+39 0541 123456',
      email: 'info@beachfashion.it',
      website: 'https://www.beachfashion.it',
      discount_tier: 'A',
      payment_terms: '30 giorni',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Summer Collection',
      code: 'RES-002',
      type: 'multi_brand',
      address: 'Corso Italia, 25',
      city: 'Viareggio',
      country: 'Italia',
      phone: '+39 0584 234567',
      email: 'info@summercollection.it',
      website: 'https://www.summercollection.it',
      discount_tier: 'B',
      payment_terms: '60 giorni',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Coast Boutique',
      code: 'RES-003',
      type: 'mono_brand',
      address: 'Lungomare, 50',
      city: 'Portofino',
      country: 'Italia',
      phone: '+39 0185 345678',
      email: 'info@coastboutique.it',
      website: 'https://www.coastboutique.it',
      discount_tier: 'A',
      payment_terms: '30 giorni',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Fashion Beach',
      code: 'RES-004',
      type: 'multi_brand',
      address: 'Via Marina, 15',
      city: 'Porto Cervo',
      country: 'Italia',
      phone: '+39 0789 456789',
      email: 'info@fashionbeach.it',
      website: 'https://www.fashionbeach.it',
      discount_tier: 'C',
      payment_terms: '45 giorni',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Swimwear Paradise',
      code: 'RES-005',
      type: 'mono_brand',
      address: 'Piazza del Mare, 8',
      city: 'Taormina',
      country: 'Italia',
      phone: '+39 0942 567890',
      email: 'info@swimwearparadise.it',
      website: 'https://www.swimwearparadise.it',
      discount_tier: 'B',
      payment_terms: '30 giorni',
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const resellerIds: Record<string, ObjectId> = {};
  for (const reseller of resellers) {
    const result = await resellersCol.insertOne(reseller as any);
    resellerIds[reseller.code] = result.insertedId;
    console.log(`  ✅ Created reseller: ${reseller.name}`);
  }

  // 4. Create Products (global scope)
  console.log('\n📋 Creating products (scope: tenant)...');
  const productsCol = db.collection(`${tenantId}_product`);
  const productSkus = [
    'PF060F-004', 'PF001I-034I', 'PF030S-034', 'PF039CF-009', 'PF070S-009',
    'PF092I-012', 'PF090SG-009', 'PF251I-015', 'PF152F-028', 'PF076F-028',
    'PF036CF-028', 'PF240A-034', 'PF048AL-034', 'PF176GO-009', 'PF179A-009',
    'PF095GO-012', 'PF194A-009', 'PF115A-001', 'PF046A-001', 'PF145A-032',
    'PF175A-004', 'PF222A-004', 'PF221A-004', 'PF060F-005', 'PF001I-035I',
    'PF030S-035', 'PF039CF-010', 'PF070S-010', 'PF092I-013', 'PF090SG-010',
  ];

  const productNames = [
    'Bikini Triangle Jeans Studs',
    'Buffalo One Piece Swimsuit',
    'Triangle Bikini W/Rhinestones',
    'Far West Sequins Triangle Bikini',
    'Bikini Triangle Studs African Braid',
    'Anaconda One Piece Swimsuit',
    'Cobra Sliding Triangle',
    'Swimsuit One-piece In One Color',
    'Desert Flower Triangle Bikini with Laces',
    'Jute Triangle Bikini',
    'Shaded Mesh Triangle Bikini',
    'Horseshoe Ruffle Dress Solid Color',
    'Plain Tulle Pareo Dress',
    'African Braid Pleated Long Skirt',
    'African Braid Long Dress',
    'Pareo/Skirt snake\'s print',
    'Anaconda Short Dress',
    '3D Rodeo Sheath Dress',
    'Horseshoe Sheath Dress Solid Color',
    'LACE T SOLID ROBE DRESS',
    'African Braided Pleated Long Dress',
    'Marina Gold Long Dress',
    'Marina Gold Sheath Dress',
  ];

  const colors = ['Blue', 'Brown', 'Pink', 'Orange', 'Beige', 'Black', 'Green', 'Bronzo', 'White', 'Red', 'Violet', 'Light Blue'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'MX'];
  const categories = ['bikini', 'one_piece', 'clothing', 'accessories', 'curvy', 'thongs'];
  const collections = ['SS2025', 'SS2026', 'Outlet'];
  const brands = ['Pin-Up Stars', 'Poisson D\'Amour'];

  const productIds: Record<string, ObjectId> = {};
  for (let i = 0; i < productSkus.length; i++) {
    const sku = productSkus[i];
    const name = productNames[i % productNames.length];
    const category = categories[i % categories.length];
    const collection = collections[i % collections.length];
    const brand = brands[i % brands.length];
    const price = randomInt(80, 300);
    const salePrice = i % 3 === 0 ? Math.round(price * 0.5) : undefined;
    const productColors = randomElements(colors, randomInt(2, 5));
    const productSizes = randomElements(sizes, randomInt(3, 6));

    const product = {
      tenant_id: tenantId,
      name,
      sku,
      brand,
      category,
      collection,
      description: `Beautiful ${name} from ${brand} ${collection} collection. Perfect for beach and pool.`,
      price,
      sale_price: salePrice,
      colors: productColors,
      sizes: productSizes,
      materials: ['Polyamide', 'Elastane'],
      images: [`https://pinup-stars.com/images/${sku}-1.jpg`],
      stock_quantity: randomInt(0, 100),
      is_active: true,
      is_featured: i < 5,
      tags: [category, collection, brand],
      created_at: now,
      updated_at: now,
    };

    const result = await productsCol.insertOne(product as any);
    productIds[sku] = result.insertedId;
    if (i < 10) {
      console.log(`  ✅ Created product: ${name} (${sku})`);
    }
  }
  console.log(`  ✅ Created ${productSkus.length} products total`);

  // 5. Create Inventory (global scope)
  console.log('\n📋 Creating inventory (scope: tenant)...');
  const inventoryCol = db.collection(`${tenantId}_inventory`);
  let inventoryCount = 0;

  for (const [sku, productId] of Object.entries(productIds)) {
    // Distribute inventory across warehouses
    const warehouseCodes = Object.keys(warehouseIds);
    const numWarehouses = randomInt(1, Math.min(3, warehouseCodes.length));

    for (let i = 0; i < numWarehouses; i++) {
      const warehouseCode = warehouseCodes[i];
      const quantity = randomInt(5, 50);
      const reservedQuantity = randomInt(0, Math.floor(quantity * 0.3));
      const availableQuantity = quantity - reservedQuantity;

      const inventory = {
        tenant_id: tenantId,
        product_id: productId,
        warehouse_id: warehouseIds[warehouseCode],
        quantity,
        reserved_quantity: reservedQuantity,
        available_quantity: availableQuantity,
        reorder_point: 10,
        max_stock: 100,
        last_updated: now,
        location: `Zona ${String.fromCharCode(65 + i)}-${randomInt(1, 20)}`,
        created_at: now,
        updated_at: now,
      };

      await inventoryCol.insertOne(inventory as any);
      inventoryCount++;
    }
  }
  console.log(`  ✅ Created ${inventoryCount} inventory records`);

  // 6. Create Contacts (global scope) - Key customers
  console.log('\n📋 Creating contacts (scope: tenant)...');
  const contactsCol = db.collection(`${tenantId}_contact`);

  // Maria Rossi - VIP Customer
  const mariaRossi = {
    tenant_id: tenantId,
    name: 'Maria Rossi',
    email: 'maria.rossi@example.com',
    phone: '+39 335 1234567',
    age: 35,
    gender: 'female',
    birth_date: dateToDateTime('1989-05-15'),
    country: 'Italia',
    city: 'Milano',
    postal_code: '20121',
    address: 'Via Manzoni, 10, 20121 Milano',
    preferences: ['bikini', 'one_piece', 'accessories'],
    purchase_count: 12,
    total_spent: 2450.00,
    last_purchase_date: dateObjToDateTime(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    fidelity_points: 245,
    newsletter_subscribed: true,
    labels: ['vip', 'regular_customer', 'newsletter_subscriber'],
    created_at: now,
    updated_at: now,
  };

  // Giulia Bianchi - Regular Customer with returns
  const giuliaBianchi = {
    tenant_id: tenantId,
    name: 'Giulia Bianchi',
    email: 'giulia.bianchi@example.com',
    phone: '+39 335 2345678',
    age: 28,
    gender: 'female',
    birth_date: dateToDateTime('1996-08-22'),
    country: 'Italia',
    city: 'Roma',
    postal_code: '00186',
    address: 'Via del Corso, 50, 00186 Roma',
    preferences: ['bikini', 'curvy'],
    purchase_count: 6,
    total_spent: 980.00,
    last_purchase_date: dateObjToDateTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    fidelity_points: 98,
    newsletter_subscribed: true,
    labels: ['regular_customer', 'newsletter_subscriber'],
    created_at: now,
    updated_at: now,
  };

  // Sofia Verdi - New Customer
  const sofiaVerdi = {
    tenant_id: tenantId,
    name: 'Sofia Verdi',
    email: 'sofia.verdi@example.com',
    phone: '+39 335 3456789',
    age: 24,
    gender: 'female',
    birth_date: dateToDateTime('2000-03-10'),
    country: 'Italia',
    city: 'Firenze',
    postal_code: '50122',
    address: 'Via dei Calzaiuoli, 20, 50122 Firenze',
    preferences: ['bikini', 'one_piece'],
    purchase_count: 2,
    total_spent: 320.00,
    last_purchase_date: dateObjToDateTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    fidelity_points: 32,
    newsletter_subscribed: false,
    labels: ['new_customer'],
    created_at: now,
    updated_at: now,
  };

  // Anna Neri - Customer with complaints
  const annaNeri = {
    tenant_id: tenantId,
    name: 'Anna Neri',
    email: 'anna.neri@example.com',
    phone: '+39 335 4567890',
    age: 32,
    gender: 'female',
    birth_date: dateToDateTime('1992-11-05'),
    country: 'Italia',
    city: 'Bologna',
    postal_code: '40121',
    address: 'Via Indipendenza, 30, 40121 Bologna',
    preferences: ['one_piece', 'clothing'],
    purchase_count: 4,
    total_spent: 650.00,
    last_purchase_date: dateObjToDateTime(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
    fidelity_points: 65,
    newsletter_subscribed: true,
    labels: ['regular_customer', 'newsletter_subscriber'],
    created_at: now,
    updated_at: now,
  };

  // Additional customers
  const additionalCustomers = [
    {
      tenant_id: tenantId,
      name: 'Elena Ferrari',
      email: 'elena.ferrari@example.com',
      phone: '+39 335 5678901',
      age: 29,
      gender: 'female',
      birth_date: dateToDateTime('1995-07-18'),
      country: 'Italia',
      city: 'Torino',
      postal_code: '10121',
      address: 'Via Roma, 15, 10121 Torino',
      preferences: ['bikini', 'accessories'],
      purchase_count: 3,
      total_spent: 450.00,
      last_purchase_date: dateObjToDateTime(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
      fidelity_points: 45,
      newsletter_subscribed: true,
      labels: ['regular_customer'],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      name: 'Chiara Romano',
      email: 'chiara.romano@example.com',
      phone: '+39 335 6789012',
      age: 26,
      gender: 'female',
      birth_date: dateToDateTime('1998-04-25'),
      country: 'Italia',
      city: 'Napoli',
      postal_code: '80121',
      address: 'Via Toledo, 100, 80121 Napoli',
      preferences: ['bikini', 'curvy'],
      purchase_count: 5,
      total_spent: 720.00,
      last_purchase_date: dateObjToDateTime(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
      fidelity_points: 72,
      newsletter_subscribed: true,
      labels: ['regular_customer', 'newsletter_subscriber'],
      created_at: now,
      updated_at: now,
    },
  ];

  const contactIds: Record<string, ObjectId> = {};
  const allContacts = [mariaRossi, giuliaBianchi, sofiaVerdi, annaNeri, ...additionalCustomers];

  for (const contact of allContacts) {
    const result = await contactsCol.insertOne(contact as any);
    contactIds[contact.email] = result.insertedId;
    console.log(`  ✅ Created contact: ${contact.name}`);
  }

  // Create more random contacts
  const firstNames = ['Laura', 'Francesca', 'Valentina', 'Martina', 'Alessia', 'Federica', 'Silvia', 'Roberta'];
  const lastNames = ['Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Costa', 'Fontana'];
  const cities = ['Milano', 'Roma', 'Firenze', 'Torino', 'Napoli', 'Bologna', 'Venezia', 'Genova'];
  const countries = ['Italia', 'Francia', 'Germania', 'Spagna', 'Svizzera'];

  for (let i = 0; i < 15; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const contact = {
      tenant_id: tenantId,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phone: `+39 335 ${randomInt(1000000, 9999999)}`,
      age: randomInt(20, 45),
      gender: 'female',
      birth_date: dateToDateTime(new Date(1979 + randomInt(0, 25), randomInt(0, 11), randomInt(1, 28)).toISOString().split('T')[0]),
      country: randomElement(countries),
      city: randomElement(cities),
      postal_code: `${randomInt(10000, 99999)}`,
      address: `Via ${randomElement(['Roma', 'Milano', 'Napoli', 'Torino'])}, ${randomInt(1, 200)}`,
      preferences: randomElements(['bikini', 'one_piece', 'accessories', 'curvy', 'clothing'], randomInt(1, 3)),
      purchase_count: randomInt(0, 8),
      total_spent: randomInt(0, 1500),
      last_purchase_date: dateObjToDateTime(randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), now)),
      fidelity_points: randomInt(0, 150),
      newsletter_subscribed: Math.random() > 0.5,
      labels: randomElements(['regular_customer', 'new_customer', 'newsletter_subscriber'], randomInt(0, 2)),
      created_at: now,
      updated_at: now,
    };

    const result = await contactsCol.insertOne(contact as any);
    contactIds[contact.email] = result.insertedId;
  }
  console.log(`  ✅ Created ${allContacts.length + 15} contacts total`);

  // 7. Create Fidelity Program records (global scope)
  console.log('\n📋 Creating fidelity program records (scope: tenant)...');
  const fidelityCol = db.collection(`${tenantId}_fidelity_program`);

  const fidelityRecords = [
    {
      tenant_id: tenantId,
      customer_id: contactIds['maria.rossi@example.com'],
      total_points: 245,
      available_points: 245,
      used_points: 0,
      expired_points: 0,
      tier: 'platinum',
      last_activity_date: new Date(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      expiry_date: new Date(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      customer_id: contactIds['giulia.bianchi@example.com'],
      total_points: 98,
      available_points: 98,
      used_points: 0,
      expired_points: 0,
      tier: 'gold',
      last_activity_date: new Date(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      expiry_date: new Date(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      customer_id: contactIds['sofia.verdi@example.com'],
      total_points: 32,
      available_points: 32,
      used_points: 0,
      expired_points: 0,
      tier: 'bronze',
      last_activity_date: new Date(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      expiry_date: new Date(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      customer_id: contactIds['anna.neri@example.com'],
      total_points: 65,
      available_points: 65,
      used_points: 0,
      expired_points: 0,
      tier: 'silver',
      last_activity_date: new Date(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      expiry_date: new Date(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString(),
      created_at: now,
      updated_at: now,
    },
  ];

  for (const fidelity of fidelityRecords) {
    await fidelityCol.insertOne(fidelity as any);
    console.log(`  ✅ Created fidelity record for customer`);
  }

  // 8. Create Orders (local scope - unit specific)
  console.log('\n📋 Creating orders (scope: unit)...');
  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
  const paymentStatuses = ['pending', 'partial', 'paid', 'refunded', 'failed'];
  const orderTypes = ['online', 'retail', 'wholesale'];
  const paymentMethods = ['credit_card', 'paypal', 'bank_transfer', 'cash'];

  const orderIds: Record<string, ObjectId> = {};
  let orderCounter = 1;

  // Maria Rossi orders (VIP customer)
  for (let i = 0; i < 12; i++) {
    const unit = i % 2 === 0 ? 'ecommerce' : 'retail';
    const orderDate = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), now);
    const status = i < 8 ? 'delivered' : i < 10 ? 'shipped' : 'processing';
    const paymentStatus = status === 'delivered' ? 'paid' : status === 'shipped' ? 'paid' : 'pending';

    const order = {
      tenant_id: tenantId,
      unit_id: unit,
      order_number: `ORD-2024-${String(orderCounter).padStart(3, '0')}`,
      order_date: orderDate,
      customer_id: contactIds['maria.rossi@example.com'],
      store_id: unit === 'retail' ? storeIds['STORE-MIL-001'] : undefined,
      order_type: unit === 'retail' ? 'retail' : 'online',
      status,
      payment_status: paymentStatus,
      payment_method: randomElement(paymentMethods),
      subtotal: randomInt(150, 300),
      discount: randomInt(0, 30),
      shipping_cost: unit === 'online' ? 10 : 0,
      total: 0, // Will calculate
      currency: 'EUR',
      shipping_address: mariaRossi.address,
      billing_address: mariaRossi.address,
      fidelity_points_earned: randomInt(15, 30),
      fidelity_points_used: i % 3 === 0 ? randomInt(10, 50) : 0,
      notes: i === 0 ? 'Cliente VIP - spedizione prioritaria' : undefined,
      created_at: orderDate,
      updated_at: orderDate,
    };

    order.total = order.subtotal - order.discount + order.shipping_cost;
    if (order.fidelity_points_used > 0) {
      order.total = Math.max(0, order.total - order.fidelity_points_used);
    }

    const orderCol = db.collection(`${tenantId}_${unit}_order_header`);
    const result = await orderCol.insertOne(order as any);
    orderIds[order.order_number] = result.insertedId;
    orderCounter++;
  }

  // Giulia Bianchi orders (with returns)
  for (let i = 0; i < 6; i++) {
    const unit = 'ecommerce';
    const orderDate = randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), now);
    const status = i < 3 ? 'delivered' : i < 4 ? 'returned' : 'processing';
    const paymentStatus = status === 'returned' ? 'refunded' : status === 'delivered' ? 'paid' : 'pending';

    const order = {
      tenant_id: tenantId,
      unit_id: unit,
      order_number: `ORD-2024-${String(orderCounter).padStart(3, '0')}`,
      order_date: orderDate,
      customer_id: contactIds['giulia.bianchi@example.com'],
      order_type: 'online',
      status,
      payment_status: paymentStatus,
      payment_method: randomElement(paymentMethods),
      subtotal: randomInt(120, 250),
      discount: randomInt(0, 20),
      shipping_cost: 10,
      total: 0,
      currency: 'EUR',
      shipping_address: giuliaBianchi.address,
      billing_address: giuliaBianchi.address,
      fidelity_points_earned: randomInt(12, 25),
      fidelity_points_used: 0,
      notes: status === 'returned' ? 'Reso per taglia errata' : undefined,
      created_at: orderDate,
      updated_at: orderDate,
    };

    order.total = order.subtotal - order.discount + order.shipping_cost;
    if (status === 'returned') {
      order.total = 0;
    }

    const orderCol = db.collection(`${tenantId}_${unit}_order_header`);
    const result = await orderCol.insertOne(order as any);
    orderIds[order.order_number] = result.insertedId;
    orderCounter++;
  }

  // Anna Neri orders (with problems)
  for (let i = 0; i < 4; i++) {
    const unit = 'ecommerce';
    const orderDate = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), now);
    const status = i < 2 ? 'delivered' : 'processing';
    const paymentStatus = status === 'delivered' ? 'paid' : 'pending';

    const order = {
      tenant_id: tenantId,
      unit_id: unit,
      order_number: `ORD-2024-${String(orderCounter).padStart(3, '0')}`,
      order_date: orderDate,
      customer_id: contactIds['anna.neri@example.com'],
      order_type: 'online',
      status,
      payment_status: paymentStatus,
      payment_method: randomElement(paymentMethods),
      subtotal: randomInt(100, 200),
      discount: randomInt(0, 15),
      shipping_cost: 10,
      total: 0,
      currency: 'EUR',
      shipping_address: annaNeri.address,
      billing_address: annaNeri.address,
      fidelity_points_earned: randomInt(10, 20),
      fidelity_points_used: 0,
      notes: i === 1 ? 'Problema con qualità prodotto' : undefined,
      created_at: orderDate,
      updated_at: orderDate,
    };

    order.total = order.subtotal - order.discount + order.shipping_cost;

    const orderCol = db.collection(`${tenantId}_${unit}_order_header`);
    const result = await orderCol.insertOne(order as any);
    orderIds[order.order_number] = result.insertedId;
    orderCounter++;
  }

  // Sofia Verdi orders (new customer)
  for (let i = 0; i < 2; i++) {
    const unit = 'ecommerce';
    const orderDate = randomDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), now);
    const status = i === 0 ? 'delivered' : 'shipped';

    const order = {
      tenant_id: tenantId,
      unit_id: unit,
      order_number: `ORD-2024-${String(orderCounter).padStart(3, '0')}`,
      order_date: orderDate,
      customer_id: contactIds['sofia.verdi@example.com'],
      order_type: 'online',
      status,
      payment_status: 'paid',
      payment_method: randomElement(paymentMethods),
      subtotal: randomInt(150, 200),
      discount: randomInt(0, 25),
      shipping_cost: 10,
      total: 0,
      currency: 'EUR',
      shipping_address: sofiaVerdi.address,
      billing_address: sofiaVerdi.address,
      fidelity_points_earned: randomInt(15, 20),
      fidelity_points_used: 0,
      created_at: orderDate,
      updated_at: orderDate,
    };

    order.total = order.subtotal - order.discount + order.shipping_cost;

    const orderCol = db.collection(`${tenantId}_${unit}_order_header`);
    const result = await orderCol.insertOne(order as any);
    orderIds[order.order_number] = result.insertedId;
    orderCounter++;
  }

  // Wholesale orders
  for (let i = 0; i < 5; i++) {
    const unit = 'wholesale';
    const orderDate = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), now);
    const resellerCode = Object.keys(resellerIds)[i % Object.keys(resellerIds).length];

    const order = {
      tenant_id: tenantId,
      unit_id: unit,
      order_number: `ORD-WH-2024-${String(i + 1).padStart(3, '0')}`,
      order_date: orderDate,
      customer_id: contactIds['maria.rossi@example.com'], // Using contact as placeholder
      reseller_id: resellerIds[resellerCode],
      order_type: 'wholesale',
      status: i < 3 ? 'delivered' : 'processing',
      payment_status: i < 3 ? 'paid' : 'pending',
      payment_method: 'bank_transfer',
      subtotal: randomInt(500, 1500),
      discount: randomInt(20, 40),
      shipping_cost: 50,
      total: 0,
      currency: 'EUR',
      shipping_address: 'Via del Mare, 10, Rimini',
      billing_address: 'Via del Mare, 10, Rimini',
      fidelity_points_earned: 0,
      fidelity_points_used: 0,
      created_at: orderDate,
      updated_at: orderDate,
    };

    order.total = order.subtotal - order.discount + order.shipping_cost;

    const orderCol = db.collection(`${tenantId}_${unit}_order_header`);
    const result = await orderCol.insertOne(order as any);
    orderIds[order.order_number] = result.insertedId;
  }

  console.log(`  ✅ Created ${Object.keys(orderIds).length} orders`);

  // 9. Create Order Lines
  console.log('\n📋 Creating order lines (scope: unit)...');
  let orderLineCount = 0;

  for (const [orderNumber, orderId] of Object.entries(orderIds)) {
    const orderCol = db.collection(`${tenantId}_ecommerce_order_header`);
    const order = await orderCol.findOne({ _id: orderId });
    if (!order) continue;

    const unit = (order as any).unit_id || 'ecommerce';
    const numLines = randomInt(1, 4);
    const productSkusList = Object.keys(productIds);

    for (let i = 0; i < numLines; i++) {
      const productSku = randomElement(productSkusList);
      const productId = productIds[productSku];
      const quantity = randomInt(1, 3);
      const unitPrice = randomInt(80, 200);
      const discount = randomInt(0, 20);
      const total = (unitPrice * quantity) - discount;
      const size = randomElement(['S', 'M', 'L', 'XL']);
      const color = randomElement(colors);
      const status = (order as any).status === 'returned' && i === 0 ? 'returned' : 
                     (order as any).status === 'delivered' ? 'delivered' :
                     (order as any).status === 'shipped' ? 'shipped' : 'confirmed';

      const orderLine = {
        tenant_id: tenantId,
        unit_id: unit,
        order_id: orderId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        discount,
        total,
        size,
        color,
        status,
        created_at: (order as any).order_date || now,
        updated_at: (order as any).order_date || now,
      };

      const orderLineCol = db.collection(`${tenantId}_${unit}_order_line`);
      await orderLineCol.insertOne(orderLine as any);
      orderLineCount++;
    }
  }

  console.log(`  ✅ Created ${orderLineCount} order lines`);

  // 10. Create Support Tickets (local scope)
  console.log('\n📋 Creating support tickets (scope: unit)...');
  const ticketCol = db.collection(`${tenantId}_customer_service_support_ticket`);
  const ticketTypes = ['return', 'exchange', 'warranty', 'information', 'complaint', 'other'];
  const ticketStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
  const ticketPriorities = ['low', 'medium', 'high', 'urgent'];
  const authorTypes = ['customer', 'agent', 'system'];

  const ticketIds: Record<string, ObjectId> = {};
  let ticketCounter = 1;

  // Ticket for Maria Rossi - Information (resolved)
  const ticket1 = {
    tenant_id: tenantId,
    unit_id: 'customer_service',
    ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
    customer_id: contactIds['maria.rossi@example.com'],
    type: 'information',
    status: 'resolved',
    priority: 'medium',
    subject: 'Informazioni su prodotto PF060F-004',
    description: 'Vorrei sapere se il prodotto PF060F-004 è disponibile in taglia M e colore Blue.',
    author_type: 'customer',
    assigned_to: 'cs_agent1@demo3.local',
    created_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    resolved_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    resolution: 'Prodotto disponibile. Informazioni inviate via email.',
    is_thread_root: true,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
  };
  const result1 = await ticketCol.insertOne(ticket1 as any);
  ticketIds[ticket1.ticket_number] = result1.insertedId;
  ticketCounter++;

  // Response to ticket1
  const ticket1Response = {
    tenant_id: tenantId,
    unit_id: 'customer_service',
    ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
    customer_id: contactIds['maria.rossi@example.com'],
    parent_ticket_id: result1.insertedId,
    type: 'information',
    status: 'resolved',
    priority: 'medium',
    subject: 'Re: Informazioni su prodotto PF060F-004',
    description: 'Sì, il prodotto è disponibile in taglia M e colore Blue. Può ordinarlo direttamente dal sito.',
    author_type: 'agent',
    assigned_to: 'cs_agent1@demo3.local',
    created_date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
    is_thread_root: false,
    created_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
  };
  await ticketCol.insertOne(ticket1Response as any);
  ticketCounter++;

  // Ticket for Giulia Bianchi - Return (in progress)
  const ticket2 = {
    tenant_id: tenantId,
    unit_id: 'customer_service',
    ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
    customer_id: contactIds['giulia.bianchi@example.com'],
    order_id: orderIds['ORD-2024-013'],
    type: 'return',
    status: 'in_progress',
    priority: 'high',
    subject: 'Richiesta reso ordine ORD-2024-013',
    description: 'Ho ricevuto il prodotto ma la taglia non è corretta. Vorrei effettuare il reso.',
    author_type: 'customer',
    assigned_to: 'cs_agent2@demo3.local',
    created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    is_thread_root: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  };
  const result2 = await ticketCol.insertOne(ticket2 as any);
  ticketIds[ticket2.ticket_number] = result2.insertedId;
  ticketCounter++;

  // Ticket for Anna Neri - Complaint (resolved)
  const ticket3 = {
    tenant_id: tenantId,
    unit_id: 'customer_service',
    ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
    customer_id: contactIds['anna.neri@example.com'],
    order_id: orderIds['ORD-2024-015'],
    type: 'complaint',
    status: 'resolved',
    priority: 'high',
    subject: 'Reclamo qualità prodotto',
    description: 'Il prodotto ricevuto presenta difetti di fabbricazione. Richiedo sostituzione o rimborso.',
    author_type: 'customer',
    assigned_to: 'cs_agent1@demo3.local',
    created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    resolved_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    resolution: 'Prodotto sostituito. Nuovo ordine inviato.',
    is_thread_root: true,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  };
  const result3 = await ticketCol.insertOne(ticket3 as any);
  ticketIds[ticket3.ticket_number] = result3.insertedId;
  ticketCounter++;

  // Ticket for Sofia Verdi - Information (open)
  const ticket4 = {
    tenant_id: tenantId,
    unit_id: 'customer_service',
    ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
    customer_id: contactIds['sofia.verdi@example.com'],
    type: 'information',
    status: 'open',
    priority: 'low',
    subject: 'Informazioni spedizione',
    description: 'Quando riceverò il mio ordine?',
    author_type: 'customer',
    assigned_to: undefined,
    created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    is_thread_root: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  };
  const result4 = await ticketCol.insertOne(ticket4 as any);
  ticketIds[ticket4.ticket_number] = result4.insertedId;
  ticketCounter++;

  // Ticket for Anna Neri - Warranty (in progress)
  const ticket5 = {
    tenant_id: tenantId,
    unit_id: 'customer_service',
    ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
    customer_id: contactIds['anna.neri@example.com'],
    order_id: orderIds['ORD-2024-016'],
    type: 'warranty',
    status: 'in_progress',
    priority: 'medium',
    subject: 'Richiesta garanzia prodotto',
    description: 'Il prodotto ha un difetto dopo pochi utilizzi. Richiedo assistenza garanzia.',
    author_type: 'customer',
    assigned_to: 'cs_agent2@demo3.local',
    created_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    is_thread_root: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  };
  const result5 = await ticketCol.insertOne(ticket5 as any);
  ticketIds[ticket5.ticket_number] = result5.insertedId;
  ticketCounter++;

  // Create more random tickets
  for (let i = 0; i < 15; i++) {
    const customerEmails = Object.keys(contactIds);
    const customerEmail = randomElement(customerEmails);
    const orderNumbers = Object.keys(orderIds);
    const orderNumber = randomElement(orderNumbers);
    const orderId = orderIds[orderNumber];

    const ticket = {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      ticket_number: `TKT-2024-${String(ticketCounter).padStart(4, '0')}`,
      customer_id: contactIds[customerEmail],
      order_id: Math.random() > 0.5 ? orderId : undefined,
      type: randomElement(ticketTypes),
      status: randomElement(ticketStatuses),
      priority: randomElement(ticketPriorities),
      subject: `Richiesta ${randomElement(['informazioni', 'reso', 'garanzia', 'supporto'])}`,
      description: `Descrizione della richiesta ${i + 1}`,
      author_type: randomElement(authorTypes),
      assigned_to: Math.random() > 0.3 ? randomElement(['cs_agent1@demo3.local', 'cs_agent2@demo3.local']) : undefined,
      created_date: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), now),
      resolved_date: Math.random() > 0.5 ? randomDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), now) : undefined,
      resolution: Math.random() > 0.5 ? 'Problema risolto' : undefined,
      is_thread_root: true,
      created_at: now,
      updated_at: now,
    };

    await ticketCol.insertOne(ticket as any);
    ticketCounter++;
  }

  console.log(`  ✅ Created ${ticketCounter - 1} support tickets`);

  // 11. Create Tasks (local scope)
  console.log('\n📋 Creating tasks (scope: unit)...');
  const taskTypes = ['customer_follow_up', 'order_processing', 'support_ticket', 'inventory_check', 'marketing', 'other'];
  const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

  const tasks = [
    {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      title: 'Follow-up ticket TKT-2024-0004',
      description: 'Rispondere a richiesta informazioni spedizione',
      type: 'support_ticket',
      status: 'pending',
      due_date: dateToDateTime(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      contact_id: contactIds['sofia.verdi@example.com'],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'ecommerce',
      title: 'Processare ordine ORD-2024-025',
      description: 'Verificare disponibilità e preparare spedizione',
      type: 'order_processing',
      status: 'in_progress',
      due_date: dateToDateTime(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'retail',
      title: 'Follow-up cliente Maria Rossi',
      description: 'Contattare per nuova collezione',
      type: 'customer_follow_up',
      status: 'pending',
      due_date: dateToDateTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      contact_id: contactIds['maria.rossi@example.com'],
      created_at: now,
      updated_at: now,
    },
  ];

  for (const task of tasks) {
    const taskCol = db.collection(`${tenantId}_${task.unit_id}_task`);
    await taskCol.insertOne(task as any);
    console.log(`  ✅ Created task: ${task.title} in ${task.unit_id}`);
  }

  // 12. Create Notes (local scope)
  console.log('\n📋 Creating notes (scope: unit)...');
  const notes = [
    {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      title: 'Nota su Maria Rossi',
      content: 'Cliente VIP molto soddisfatta. Sempre disponibile per feedback positivi.',
      status: 'done',
      expiration_date_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      contact_id: contactIds['maria.rossi@example.com'],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      title: 'Nota su Anna Neri',
      content: 'Cliente con alcuni problemi di qualità prodotti. Monitorare attentamente.',
      status: 'on going',
      expiration_date_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      contact_id: contactIds['anna.neri@example.com'],
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'ecommerce',
      title: 'Nota ordine problematico',
      content: 'Ordine ORD-2024-015 ha avuto problemi. Cliente soddisfatto dopo sostituzione.',
      status: 'done',
      expiration_date_time: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now,
    },
  ];

  for (const note of notes) {
    const noteCol = db.collection(`${tenantId}_${note.unit_id}_note`);
    await noteCol.insertOne(note as any);
    console.log(`  ✅ Created note: ${note.title} in ${note.unit_id}`);
  }

  console.log(`\n✅ Test data created successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Global entities (scope: tenant):`);
  console.log(`     - ${stores.length} stores`);
  console.log(`     - ${warehouses.length} warehouses`);
  console.log(`     - ${resellers.length} resellers`);
  console.log(`     - ${productSkus.length} products`);
  console.log(`     - ${inventoryCount} inventory records`);
  console.log(`     - ${allContacts.length + 15} contacts`);
  console.log(`     - ${fidelityRecords.length} fidelity program records`);
  console.log(`   Local entities (scope: unit):`);
  console.log(`     - ${Object.keys(orderIds).length} orders`);
  console.log(`     - ${orderLineCount} order lines`);
  console.log(`     - ${ticketCounter - 1} support tickets`);
  console.log(`     - ${tasks.length} tasks`);
  console.log(`     - ${notes.length} notes`);

  await client.close();
}

seedData().catch((error) => {
  console.error('Failed to seed data:', error);
  process.exit(1);
});

