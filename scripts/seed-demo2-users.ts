import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { hashPassword } from '@crm-atlas/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

interface PermissionsConfig {
  tenant_id: string;
  roles: Array<{
    role: string;
    scopes: string[];
  }>;
}

async function seedDemo2Users(): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  // Read permissions config to get scopes for each role
  const permissionsPath = join(process.cwd(), 'config', tenantId, 'permissions.json');
  const permissionsConfig: PermissionsConfig = JSON.parse(readFileSync(permissionsPath, 'utf-8'));

  const getScopesForRole = (role: string): string[] => {
    const roleConfig = permissionsConfig.roles.find((r) => r.role === role);
    return roleConfig?.scopes || [];
  };

  const passwordHash = await hashPassword('password123');
  const adminPasswordHash = await hashPassword('changeme');
  const now = new Date();

  const users = [
    // Admin and Organization Manager
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      email: 'admin@demo2.local',
      passwordHash: adminPasswordHash,
      roles: ['admin'],
      scopes: getScopesForRole('admin'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      email: 'org_manager@demo2.local',
      passwordHash,
      roles: ['organization_manager'],
      scopes: getScopesForRole('organization_manager'),
      created_at: now,
      updated_at: now,
    },
    // Unit Managers
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      email: 'milan_sales_manager@demo2.local',
      passwordHash,
      roles: ['unit_manager'],
      scopes: getScopesForRole('unit_manager'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'milano_service',
      email: 'milan_service_manager@demo2.local',
      passwordHash,
      roles: ['unit_manager'],
      scopes: getScopesForRole('unit_manager'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_sales',
      email: 'roma_sales_manager@demo2.local',
      passwordHash,
      roles: ['unit_manager'],
      scopes: getScopesForRole('unit_manager'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_service',
      email: 'roma_service_manager@demo2.local',
      passwordHash,
      roles: ['unit_manager'],
      scopes: getScopesForRole('unit_manager'),
      created_at: now,
      updated_at: now,
    },
    // Sales Reps
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      email: 'milan_sales_rep1@demo2.local',
      passwordHash,
      roles: ['sales_rep'],
      scopes: getScopesForRole('sales_rep'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      email: 'milan_sales_rep2@demo2.local',
      passwordHash,
      roles: ['sales_rep'],
      scopes: getScopesForRole('sales_rep'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_sales',
      email: 'roma_sales_rep1@demo2.local',
      passwordHash,
      roles: ['sales_rep'],
      scopes: getScopesForRole('sales_rep'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'torino_sales',
      email: 'torino_sales_rep1@demo2.local',
      passwordHash,
      roles: ['sales_rep'],
      scopes: getScopesForRole('sales_rep'),
      created_at: now,
      updated_at: now,
    },
    // Service Reps
    {
      tenant_id: tenantId,
      unit_id: 'milano_service',
      email: 'milan_service_rep1@demo2.local',
      passwordHash,
      roles: ['service_rep'],
      scopes: getScopesForRole('service_rep'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'milano_service',
      email: 'milan_service_rep2@demo2.local',
      passwordHash,
      roles: ['service_rep'],
      scopes: getScopesForRole('service_rep'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'roma_service',
      email: 'roma_service_rep1@demo2.local',
      passwordHash,
      roles: ['service_rep'],
      scopes: getScopesForRole('service_rep'),
      created_at: now,
      updated_at: now,
    },
    // Accounting
    {
      tenant_id: tenantId,
      unit_id: 'milano_sales',
      email: 'accounting@demo2.local',
      passwordHash,
      roles: ['accounting'],
      scopes: getScopesForRole('accounting'),
      created_at: now,
      updated_at: now,
    },
  ];

  console.log(`\n📋 Creating users for tenant: ${tenantId}\n`);

  for (const user of users) {
    await db
      .collection('users')
      .replaceOne({ tenant_id: tenantId, email: user.email.toLowerCase() }, user, { upsert: true });
    console.log(
      `✅ Created/Updated: ${user.email} (role: ${user.roles.join(', ')}, unit: ${user.unit_id})`
    );
  }

  console.log(`\n✅ All users created for tenant: ${tenantId}`);
  console.log(`\n📋 Users Summary:`);
  console.log(`   👤 Admin: admin@demo2.local / changeme (role: admin)`);
  console.log(`   👤 Organization Manager: org_manager@demo2.local / password123`);
  console.log(
    `   👤 Unit Managers: milan_sales_manager@demo2.local, milan_service_manager@demo2.local, roma_sales_manager@demo2.local, roma_service_manager@demo2.local / password123`
  );
  console.log(
    `   👤 Sales Reps: milan_sales_rep1@demo2.local, milan_sales_rep2@demo2.local, roma_sales_rep1@demo2.local, torino_sales_rep1@demo2.local / password123`
  );
  console.log(
    `   👤 Service Reps: milan_service_rep1@demo2.local, milan_service_rep2@demo2.local, roma_service_rep1@demo2.local / password123`
  );
  console.log(`   👤 Accounting: accounting@demo2.local / password123`);

  await client.close();
}

seedDemo2Users().catch((error) => {
  console.error('Failed to seed demo2 users:', error);
  process.exit(1);
});
