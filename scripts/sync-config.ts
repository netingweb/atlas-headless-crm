import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join } from 'path';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function syncConfig(tenantId: string): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  const configDir = join(process.cwd(), 'config', tenantId);

  try {
    // Sync tenant config
    const tenantConfig = JSON.parse(readFileSync(join(configDir, 'tenant.json'), 'utf-8'));
    await db
      .collection('tenant_config')
      .replaceOne({ tenant_id: tenantId }, tenantConfig, { upsert: true });
    console.log(`✅ Synced tenant.json`);

    // Sync units config
    const units = JSON.parse(readFileSync(join(configDir, 'units.json'), 'utf-8'));
    for (const unit of units) {
      await db
        .collection('units_config')
        .replaceOne({ tenant_id: tenantId, unit_id: unit.unit_id }, unit, { upsert: true });
    }
    console.log(`✅ Synced units.json`);

    // Sync entities config
    const entitiesConfig = JSON.parse(readFileSync(join(configDir, 'entities.json'), 'utf-8'));
    await db
      .collection('entities_config')
      .replaceOne({ tenant_id: tenantId }, entitiesConfig, { upsert: true });
    console.log(`✅ Synced entities.json`);

    // Sync permissions config
    const permissionsConfig = JSON.parse(
      readFileSync(join(configDir, 'permissions.json'), 'utf-8')
    );
    await db
      .collection('permissions_config')
      .replaceOne({ tenant_id: tenantId }, permissionsConfig, { upsert: true });
    console.log(`✅ Synced permissions.json`);

    // Sync dictionary config (if exists)
    try {
      const dictionaryConfig = JSON.parse(
        readFileSync(join(configDir, 'dictionary.json'), 'utf-8')
      );
      await db
        .collection('dictionary_config')
        .replaceOne({ tenant_id: tenantId }, dictionaryConfig, { upsert: true });
      console.log(`✅ Synced dictionary.json`);
    } catch {
      console.log(`ℹ️  dictionary.json not found, skipping`);
    }

    // Sync sharing policy config (if exists)
    try {
      const sharingPolicy = JSON.parse(
        readFileSync(join(configDir, 'sharing_policy.json'), 'utf-8')
      );
      await db
        .collection('sharing_policy_config')
        .replaceOne({ tenant_id: tenantId }, sharingPolicy, { upsert: true });
      console.log(`✅ Synced sharing_policy.json`);
    } catch {
      console.log(`ℹ️  sharing_policy.json not found, skipping`);
    }

    // Sync workflows config (if exists)
    try {
      const workflowsConfig = JSON.parse(readFileSync(join(configDir, 'workflows.json'), 'utf-8'));
      await db
        .collection('workflows')
        .replaceOne({ tenant_id: tenantId }, workflowsConfig, { upsert: true });
      console.log(`✅ Synced workflows.json`);
    } catch {
      console.log(`ℹ️  workflows.json not found, skipping`);
    }

    // Sync MCP manifest (if exists)
    try {
      const mcpManifest = JSON.parse(readFileSync(join(configDir, 'mcp.manifest.json'), 'utf-8'));
      await db
        .collection('mcp_manifest')
        .replaceOne({ tenant_id: tenantId }, mcpManifest, { upsert: true });
      console.log(`✅ Synced mcp.manifest.json`);
    } catch {
      console.log(`ℹ️  mcp.manifest.json not found, skipping`);
    }

    console.log(`\n✅ Configuration sync completed for tenant: ${tenantId}`);
  } catch (error) {
    console.error(`❌ Failed to sync configuration:`, error);
    throw error;
  } finally {
    await client.close();
  }
}

const tenantId = process.argv[2] || 'demo';
syncConfig(tenantId).catch((error) => {
  console.error('Failed to sync configuration:', error);
  process.exit(1);
});
