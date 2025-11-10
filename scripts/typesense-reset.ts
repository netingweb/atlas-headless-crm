import 'dotenv/config';
import { getTypesenseClient } from '../packages/search/src/typesense-client';
import { collectionName } from '../packages/utils/src/helpers';

async function reset(tenantId: string, unitId?: string): Promise<void> {
  const client = getTypesenseClient();
  const all = await client.collections().retrieve();

  // Prefix for this tenant/unit
  const prefix = unitId ? collectionName(tenantId, unitId, '') : `${tenantId}_`;

  const toDelete = all.filter((c: { name: string }) => c.name.startsWith(prefix));
  if (toDelete.length === 0) {
    console.log(`ℹ️  No collections to delete for prefix "${prefix}"`);
    return;
  }

  console.log(`🧹 Deleting ${toDelete.length} Typesense collection(s) with prefix "${prefix}"...`);
  for (const c of toDelete) {
    try {
      await client.collections(c.name).delete();
      console.log(`  ✓ Deleted ${c.name}`);
    } catch (err) {
      console.warn(`  ⚠️  Failed to delete ${c.name}:`, err instanceof Error ? err.message : err);
    }
  }
}

const tenant = process.argv[2] || process.env.DEFAULT_TENANT || 'demo';
const unit = process.argv[3]; // optional

reset(tenant, unit)
  .then(() => {
    console.log('✅ Typesense reset completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Typesense reset failed:', err);
    process.exit(1);
  });
