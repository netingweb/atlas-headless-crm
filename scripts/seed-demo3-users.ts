import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { hashPassword } from '@crm-atlas/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo3';

interface PermissionsConfig {
  tenant_id: string;
  roles: Array<{
    role: string;
    scopes: string[];
  }>;
}

async function seedDemo3Users(): Promise<void> {
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
    // Admin
    {
      tenant_id: tenantId,
      unit_id: 'ecommerce',
      email: 'admin@demo3.local',
      passwordHash: adminPasswordHash,
      roles: ['admin'],
      scopes: getScopesForRole('admin'),
      created_at: now,
      updated_at: now,
    },
    // E-commerce Unit
    {
      tenant_id: tenantId,
      unit_id: 'ecommerce',
      email: 'ecommerce_manager@demo3.local',
      passwordHash,
      roles: ['ecommerce_manager'],
      scopes: getScopesForRole('ecommerce_manager'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'ecommerce',
      email: 'ecommerce_rep@demo3.local',
      passwordHash,
      roles: ['ecommerce_rep'],
      scopes: getScopesForRole('ecommerce_rep'),
      created_at: now,
      updated_at: now,
    },
    // Retail Unit
    {
      tenant_id: tenantId,
      unit_id: 'retail',
      email: 'retail_manager@demo3.local',
      passwordHash,
      roles: ['retail_manager'],
      scopes: getScopesForRole('retail_manager'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'retail',
      email: 'retail_rep1@demo3.local',
      passwordHash,
      roles: ['retail_rep'],
      scopes: getScopesForRole('retail_rep'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'retail',
      email: 'retail_rep2@demo3.local',
      passwordHash,
      roles: ['retail_rep'],
      scopes: getScopesForRole('retail_rep'),
      created_at: now,
      updated_at: now,
    },
    // Wholesale Unit
    {
      tenant_id: tenantId,
      unit_id: 'wholesale',
      email: 'wholesale_manager@demo3.local',
      passwordHash,
      roles: ['wholesale_manager'],
      scopes: getScopesForRole('wholesale_manager'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'wholesale',
      email: 'wholesale_rep@demo3.local',
      passwordHash,
      roles: ['wholesale_rep'],
      scopes: getScopesForRole('wholesale_rep'),
      created_at: now,
      updated_at: now,
    },
    // Customer Service Unit
    {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      email: 'cs_manager@demo3.local',
      passwordHash,
      roles: ['customer_service'],
      scopes: getScopesForRole('customer_service'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      email: 'cs_agent1@demo3.local',
      passwordHash,
      roles: ['cs_agent'],
      scopes: getScopesForRole('cs_agent'),
      created_at: now,
      updated_at: now,
    },
    {
      tenant_id: tenantId,
      unit_id: 'customer_service',
      email: 'cs_agent2@demo3.local',
      passwordHash,
      roles: ['cs_agent'],
      scopes: getScopesForRole('cs_agent'),
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
  console.log(`   👤 Admin: admin@demo3.local / changeme (role: admin)`);
  console.log(`   👤 E-commerce Manager: ecommerce_manager@demo3.local / password123`);
  console.log(`   👤 E-commerce Rep: ecommerce_rep@demo3.local / password123`);
  console.log(`   👤 Retail Manager: retail_manager@demo3.local / password123`);
  console.log(`   👤 Retail Reps: retail_rep1@demo3.local, retail_rep2@demo3.local / password123`);
  console.log(`   👤 Wholesale Manager: wholesale_manager@demo3.local / password123`);
  console.log(`   👤 Wholesale Rep: wholesale_rep@demo3.local / password123`);
  console.log(`   👤 Customer Service Manager: cs_manager@demo3.local / password123`);
  console.log(`   👤 Customer Service Agents: cs_agent1@demo3.local, cs_agent2@demo3.local / password123`);

  await client.close();
}

seedDemo3Users().catch((error) => {
  console.error('Failed to seed demo3 users:', error);
  process.exit(1);
});

