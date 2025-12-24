import { getDb, connectMongo } from '@crm-atlas/db';

async function checkWorkflowLogs() {
  await connectMongo();
  const db = getDb();

  console.log('\n🔍 Checking workflow execution logs...\n');

  // Get the last execution of the workflow
  const logs = await db
    .collection('workflow_execution_logs')
    .find({
      tenant_id: 'demo',
      trigger_entity: 'contact',
    })
    .sort({ started_at: -1 })
    .limit(5)
    .toArray();

  if (logs.length === 0) {
    console.log('❌ No workflow executions found for contact entity');
    process.exit(0);
  }

  for (const log of logs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Execution ID: ${log.execution_id}`);
    console.log(`📅 Started: ${log.started_at}`);
    console.log(`✅ Status: ${log.status}`);
    console.log(`🎯 Trigger: ${log.trigger_type} - ${log.trigger_event}`);

    if (log.actions_executed && log.actions_executed.length > 0) {
      console.log(`\n🔧 Actions Executed (${log.actions_executed.length}):`);

      for (const action of log.actions_executed) {
        console.log(`\n  Action ${action.action_index} - ${action.action_type}:`);
        console.log(`    Status: ${action.status}`);
        console.log(`    Started: ${action.started_at}`);
        console.log(`    Completed: ${action.completed_at || 'N/A'}`);
        console.log(`    Duration: ${action.duration_ms || 'N/A'}ms`);

        if (action.status === 'completed' && action.result) {
          console.log(`    Result:`, JSON.stringify(action.result, null, 2).substring(0, 500));
        }

        if (action.status === 'failed' && action.error) {
          console.log(`    ❌ Error: ${action.error}`);
        }
      }
    } else {
      console.log('\n⚠️  No actions executed');
    }

    if (log.error) {
      console.log(`\n❌ Workflow Error: ${log.error}`);
    }

    if (log.context) {
      console.log(`\n📦 Context:`);
      console.log(JSON.stringify(log.context, null, 2).substring(0, 300));
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);
  process.exit(0);
}

checkWorkflowLogs().catch(console.error);
