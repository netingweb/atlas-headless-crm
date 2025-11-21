import { loadRootEnv } from '@crm-atlas/utils';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function cleanupOldWorkflowExecutions(tenantId: string): Promise<void> {
  loadRootEnv();
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  try {
    console.log(`\n🧹 Cleaning up old workflow executions for tenant: ${tenantId}\n`);

    // Get all valid workflow IDs from workflows collection
    const workflowsDoc = await db.collection('workflows').findOne({ tenant_id: tenantId });
    if (!workflowsDoc || !workflowsDoc.workflows) {
      console.log('⚠️  No workflows found for tenant, skipping cleanup');
      return;
    }

    const validWorkflowIds = new Set<string>();
    for (const workflow of workflowsDoc.workflows) {
      if (workflow.workflow_id) {
        validWorkflowIds.add(workflow.workflow_id);
      }
    }

    console.log(`📋 Found ${validWorkflowIds.size} valid workflow(s)`);
    console.log(`   Valid workflow IDs:`, Array.from(validWorkflowIds).join(', '));

    // Find all execution logs for this tenant
    const allExecutions = await db
      .collection('workflow_execution_logs')
      .find({ tenant_id: tenantId })
      .toArray();

    console.log(`\n📊 Found ${allExecutions.length} total execution log(s) for tenant`);

    // Find executions with invalid workflow_id
    const invalidExecutions = allExecutions.filter(
      (exec) => !exec.workflow_id || !validWorkflowIds.has(exec.workflow_id)
    );

    if (invalidExecutions.length === 0) {
      console.log('✅ No invalid execution logs found, nothing to clean up');
      return;
    }

    console.log(
      `\n🗑️  Found ${invalidExecutions.length} execution log(s) with invalid workflow_id:`
    );
    for (const exec of invalidExecutions) {
      console.log(
        `   - Log ID: ${exec.log_id}, Workflow ID: ${exec.workflow_id || 'missing'}, Status: ${exec.status}, Started: ${exec.started_at}`
      );
    }

    // Delete invalid executions
    const invalidWorkflowIds = new Set(
      invalidExecutions.map((exec) => exec.workflow_id).filter((id) => id)
    );

    const deleteResult = await db.collection('workflow_execution_logs').deleteMany({
      tenant_id: tenantId,
      workflow_id: { $nin: Array.from(validWorkflowIds) },
    });

    console.log(`\n✅ Deleted ${deleteResult.deletedCount} invalid execution log(s)`);
    console.log(`   Remaining execution logs: ${allExecutions.length - deleteResult.deletedCount}`);

    if (invalidWorkflowIds.size > 0) {
      console.log(`\n📝 Invalid workflow IDs that were removed:`);
      Array.from(invalidWorkflowIds).forEach((id) => console.log(`   - ${id}`));
    }
  } catch (error) {
    console.error(`❌ Error cleaning up execution logs:`, error);
    throw error;
  } finally {
    await client.close();
  }
}

const tenantId = process.argv[2] || 'demo2';

cleanupOldWorkflowExecutions(tenantId)
  .then(() => {
    console.log('\n✅ Cleanup completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
