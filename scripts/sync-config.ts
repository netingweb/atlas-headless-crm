import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function syncConfig(tenantId: string): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  const configDir = join(process.cwd(), 'config', tenantId);

  // Helper function to replace environment variable placeholders
  function replaceEnvVars(obj: unknown): unknown {
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with actual environment variable value
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          console.warn(`⚠️  Environment variable ${varName} not found, keeping placeholder`);
          return match;
        }
        return value;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => replaceEnvVars(item));
    }
    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceEnvVars(value);
      }
      return result;
    }
    return obj;
  }

  try {
    // Sync tenant config
    let tenantConfig = JSON.parse(readFileSync(join(configDir, 'tenant.json'), 'utf-8'));

    // Replace environment variable placeholders
    tenantConfig = replaceEnvVars(tenantConfig) as typeof tenantConfig;

    // Override API keys from environment variables if present (highest priority)
    if (process.env.OPENAI_API_KEY) {
      if (tenantConfig.settings?.playground?.ai) {
        tenantConfig.settings.playground.ai.apiKey = process.env.OPENAI_API_KEY;
      }
      if (tenantConfig.embeddingsProvider) {
        tenantConfig.embeddingsProvider.apiKey = process.env.OPENAI_API_KEY;
      }
      if (tenantConfig.visionProvider) {
        tenantConfig.visionProvider.apiKey = process.env.OPENAI_API_KEY;
      }
    }

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

      // Get existing workflows from database to preserve workflow_id
      const existingWorkflowsDoc = await db
        .collection('workflows')
        .findOne({ tenant_id: tenantId });
      const existingWorkflows = existingWorkflowsDoc?.workflows || [];

      // Create a map of existing workflows by name+unit_id for quick lookup
      const existingWorkflowsMap = new Map<string, { workflow_id: string; created_at?: string }>();
      for (const existing of existingWorkflows) {
        if (existing.name && existing.unit_id) {
          const key = `${existing.name}::${existing.unit_id}`;
          existingWorkflowsMap.set(key, {
            workflow_id: existing.workflow_id,
            created_at: existing.created_at,
          });
        }
      }

      // Generate UUID for workflows that don't have workflow_id
      if (workflowsConfig.workflows && Array.isArray(workflowsConfig.workflows)) {
        const now = new Date().toISOString();
        let generatedCount = 0;
        let preservedCount = 0;
        for (const workflow of workflowsConfig.workflows) {
          if (!workflow.workflow_id) {
            // Try to find existing workflow by name and unit_id
            const key = `${workflow.name}::${workflow.unit_id || ''}`;
            const existing = existingWorkflowsMap.get(key);

            if (existing) {
              // Preserve existing workflow_id
              workflow.workflow_id = existing.workflow_id;
              preservedCount++;
              console.log(
                `  Preserved UUID for workflow: ${workflow.name} -> ${workflow.workflow_id}`
              );
            } else {
              // Generate new UUID for new workflow
              workflow.workflow_id = randomUUID();
              generatedCount++;
              console.log(
                `  Generated UUID for workflow: ${workflow.name} -> ${workflow.workflow_id}`
              );
            }
          } else {
            // Workflow already has workflow_id, preserve it
            preservedCount++;
          }

          // Ensure created_at and updated_at are set if missing
          if (!workflow.created_at) {
            // Try to preserve existing created_at if available
            const key = `${workflow.name}::${workflow.unit_id || ''}`;
            const existing = existingWorkflowsMap.get(key);
            workflow.created_at = existing?.created_at || now;
          }
          if (!workflow.updated_at) {
            workflow.updated_at = now;
          }
        }
        console.log(
          `  Total workflows: ${workflowsConfig.workflows.length}, Generated UUIDs: ${generatedCount}, Preserved UUIDs: ${preservedCount}`
        );
      }

      const result = await db
        .collection('workflows')
        .replaceOne({ tenant_id: tenantId }, workflowsConfig, { upsert: true });

      console.log(
        `✅ Synced workflows.json (${result.modifiedCount} modified, ${result.upsertedCount} inserted)`
      );

      // Verify workflows were saved
      const saved = await db.collection('workflows').findOne({ tenant_id: tenantId });
      if (saved && saved.workflows) {
        console.log(`  Verified: ${saved.workflows.length} workflows saved in database`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`ℹ️  workflows.json not found, skipping`);
      } else {
        console.error(`❌ Error syncing workflows.json:`, error);
        throw error;
      }
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

    // Sync documents config (if exists)
    try {
      const documentsConfig = JSON.parse(readFileSync(join(configDir, 'documents.json'), 'utf-8'));
      await db
        .collection('documents_config')
        .replaceOne({ tenant_id: tenantId }, documentsConfig, { upsert: true });
      console.log(`✅ Synced documents.json`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`ℹ️  documents.json not found, skipping`);
      } else {
        console.error(`❌ Error syncing documents.json:`, error);
        throw error;
      }
    }

    console.log(`\n✅ Configuration sync completed for tenant: ${tenantId}`);

    // Try to clear API cache if API is running
    try {
      const apiUrl = process.env.API_URL || 'http://localhost:3000';
      const clearCacheUrl = `${apiUrl}/${tenantId}/config/clear-cache`;
      const response = await fetch(clearCacheUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = (await response.json()) as { message?: string };
        console.log(`✅ ${result.message || 'API cache cleared'}`);
      } else {
        console.log(
          `ℹ️  Could not clear API cache (API may not be running or requires authentication). Status: ${response.status}`
        );
        console.log(`   You may need to manually call: GET ${clearCacheUrl}`);
        console.log(`   Or restart the API to reload configurations.`);
      }
    } catch (error) {
      console.log(
        `ℹ️  Could not clear API cache (API may not be running). Error: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log(`   You may need to manually call the clear-cache endpoint or restart the API.`);
    }
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
