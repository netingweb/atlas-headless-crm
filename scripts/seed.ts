import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { hashPassword } from '@crm-atlas/auth';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const defaultTenant = process.env.DEFAULT_TENANT || 'demo';
const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@demo.local';
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme';

async function seed(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  // Create tenant config
  const tenantConfig = {
    tenant_id: defaultTenant,
    name: 'Demo Tenant',
    settings: {},
    embeddingsProvider: {
      name: (process.env.EMBEDDINGS_PROVIDER || 'openai') as 'openai' | 'jina',
      apiKey: process.env.OPENAI_API_KEY || process.env.JINA_API_KEY,
      model: process.env.OPENAI_MODEL || process.env.JINA_MODEL,
    },
  };

  await db
    .collection('tenant_config')
    .replaceOne({ tenant_id: defaultTenant }, tenantConfig, { upsert: true });

  // Create unit config
  const unitConfig = {
    unit_id: 'sales',
    name: 'Sales Unit',
    tenant_id: defaultTenant,
    settings: {},
  };

  await db
    .collection('units_config')
    .replaceOne({ tenant_id: defaultTenant, unit_id: 'sales' }, unitConfig, { upsert: true });

  // Create entities config
  const entitiesConfig = {
    tenant_id: defaultTenant,
    entities: [
      {
        name: 'lead',
        fields: [
          {
            name: 'name',
            type: 'string',
            required: true,
            indexed: true,
            searchable: true,
            embeddable: true,
          },
          { name: 'email', type: 'email', required: true, indexed: true, searchable: true },
          { name: 'company', type: 'string', indexed: true, searchable: true, embeddable: true },
          { name: 'status', type: 'string', indexed: true },
          { name: 'notes', type: 'text', searchable: true, embeddable: true },
        ],
      },
      {
        name: 'opportunity',
        fields: [
          {
            name: 'title',
            type: 'string',
            required: true,
            indexed: true,
            searchable: true,
            embeddable: true,
          },
          { name: 'value', type: 'number', indexed: true },
          { name: 'stage', type: 'string', indexed: true },
          { name: 'description', type: 'text', searchable: true, embeddable: true },
        ],
      },
    ],
  };

  await db
    .collection('entities_config')
    .replaceOne({ tenant_id: defaultTenant }, entitiesConfig, { upsert: true });

  // Create permissions config
  const permissionsConfig = {
    tenant_id: defaultTenant,
    roles: [
      {
        role: 'admin',
        scopes: ['crm:read', 'crm:write', 'crm:delete', 'workflows:manage', 'workflows:execute'],
      },
      { role: 'sales_manager', scopes: ['crm:read', 'crm:write'] },
      { role: 'sales_rep', scopes: ['crm:read'] },
    ],
  };

  await db
    .collection('permissions_config')
    .replaceOne({ tenant_id: defaultTenant }, permissionsConfig, { upsert: true });

  // Create admin user
  const passwordHash = await hashPassword(defaultAdminPassword);
  const adminUser = {
    tenant_id: defaultTenant,
    unit_id: 'sales',
    email: defaultAdminEmail.toLowerCase(),
    passwordHash,
    roles: ['admin'],
    scopes: ['crm:read', 'crm:write', 'crm:delete', 'workflows:manage', 'workflows:execute'],
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db
    .collection('users')
    .replaceOne({ tenant_id: defaultTenant, email: defaultAdminEmail.toLowerCase() }, adminUser, {
      upsert: true,
    });

  // Create sales manager user
  const managerPasswordHash = await hashPassword('password123');
  const managerUser = {
    tenant_id: defaultTenant,
    unit_id: 'sales',
    email: 'manager@demo.local',
    passwordHash: managerPasswordHash,
    roles: ['sales_manager'],
    scopes: ['crm:read', 'crm:write'],
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db
    .collection('users')
    .replaceOne({ tenant_id: defaultTenant, email: 'manager@demo.local' }, managerUser, {
      upsert: true,
    });

  // Create sales rep user
  const repPasswordHash = await hashPassword('password123');
  const repUser = {
    tenant_id: defaultTenant,
    unit_id: 'sales',
    email: 'rep@demo.local',
    passwordHash: repPasswordHash,
    roles: ['sales_rep'],
    scopes: ['crm:read'],
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db
    .collection('users')
    .replaceOne({ tenant_id: defaultTenant, email: 'rep@demo.local' }, repUser, {
      upsert: true,
    });

  console.log(`✅ Seeded database with tenant: ${defaultTenant}`);
  console.log(`\n📋 Users created:`);
  console.log(`   👤 Admin: ${defaultAdminEmail} / ${defaultAdminPassword} (role: admin)`);
  console.log(`   👤 Manager: manager@demo.local / password123 (role: sales_manager)`);
  console.log(`   👤 Sales Rep: rep@demo.local / password123 (role: sales_rep)`);

  await client.close();
}

seed().catch((error) => {
  console.error('Failed to seed database:', error);
  process.exit(1);
});
