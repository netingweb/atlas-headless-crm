/**
 * Test script: Update contact to trigger workflow
 */

const TENANT = 'demo';
const UNIT = 'sales';
const CONTACT_ID = process.argv[2] || '6921f873cbc7ee00e8db33f0';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';

async function testContactUpdate() {
  console.log('\n🧪 Testing workflow by updating contact...\n');
  console.log(`📋 Contact ID: ${CONTACT_ID}`);
  console.log(`🏢 Tenant: ${TENANT} / ${UNIT}\n`);

  try {
    // Step 1: Get current contact data
    console.log('📥 Fetching current contact data...');
    const getUrl = `${API_URL}/${TENANT}/${UNIT}/entities/contact/${CONTACT_ID}`;

    const getResponse = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to fetch contact: ${getResponse.status} ${getResponse.statusText}`);
    }

    const currentContact = await getResponse.json();
    console.log('✅ Current contact data:');
    console.log(`   Name: ${currentContact.name}`);
    console.log(`   Email: ${currentContact.email}`);
    console.log(`   Status: ${currentContact.status || 'N/A'}\n`);

    // Step 2: Update contact (just update the status or add a comment field)
    console.log('📤 Updating contact to trigger workflow...');
    const updateUrl = `${API_URL}/${TENANT}/${UNIT}/entities/contact/${CONTACT_ID}`;

    const updateData = {
      // Keep existing data and just update a field to trigger the workflow
      status: currentContact.status || 'customer',
      // Add a timestamp to ensure it's a real update
      updated_by_test: new Date().toISOString(),
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update contact: ${updateResponse.status} ${errorText}`);
    }

    const updatedContact = await updateResponse.json();
    console.log('✅ Contact updated successfully!');
    console.log(`   Updated at: ${updatedContact.updated_at}\n`);

    // Step 3: Wait for workflow execution
    console.log('⏳ Waiting for workflow execution (8 seconds)...\n');
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Step 4: Check workflow executions
    console.log('📊 Checking workflow execution logs...\n');
    const WORKFLOW_ID = 'dd071a43-858b-4749-b8db-66c443b24c7b';
    const logsUrl = `${API_URL}/${TENANT}/${UNIT}/workflows/${WORKFLOW_ID}/executions?limit=1`;

    const logsResponse = await fetch(logsUrl, {
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    if (!logsResponse.ok) {
      console.log('⚠️  Could not fetch workflow logs');
      return;
    }

    const logs = await logsResponse.json();

    if (logs.length === 0) {
      console.log('⚠️  No workflow executions found');
      console.log('💡 The workflow might not have been triggered. Check:');
      console.log('   1. Workflow is enabled');
      console.log('   2. Workflow engine is running');
      console.log('   3. Redis is running\n');
      return;
    }

    const log = logs[0];

    console.log('═'.repeat(80));
    console.log(`📋 Latest Workflow Execution`);
    console.log('═'.repeat(80));
    console.log(`   Execution ID: ${log.execution_id}`);
    console.log(`   Status: ${log.status}`);
    console.log(`   Started: ${log.started_at}`);
    console.log(`   Completed: ${log.completed_at || 'N/A'}`);
    console.log(`   Trigger: ${log.trigger_type} - ${log.trigger_event || 'N/A'}`);
    console.log('');

    if (log.actions_executed && log.actions_executed.length > 0) {
      console.log(`🔧 Actions Executed (${log.actions_executed.length}):\n`);

      for (const action of log.actions_executed) {
        console.log(`   [${action.action_index}] ${action.action_type.toUpperCase()}`);
        console.log(`       Status: ${action.status}`);
        console.log(`       Duration: ${action.duration_ms || 'N/A'}ms`);

        if (action.status === 'completed' && action.result) {
          console.log(`       Result Preview:`);
          const resultStr = JSON.stringify(action.result, null, 2);
          const preview = resultStr.length > 300 ? resultStr.substring(0, 300) + '...' : resultStr;
          console.log(`       ${preview.split('\n').join('\n       ')}`);
        }

        if (action.status === 'failed' && action.error) {
          console.log(`       ❌ ERROR: ${action.error}`);
        }
        console.log('');
      }
    } else {
      console.log('   ⚠️  No actions executed\n');
    }

    if (log.error) {
      console.log(`❌ Workflow Error: ${log.error}\n`);
    }

    console.log('═'.repeat(80));

    // Step 5: Summary
    if (log.status === 'completed') {
      console.log('\n✅ SUCCESS! Workflow completed successfully!');

      // Check if action 1 (webhook) succeeded
      if (log.actions_executed[0]?.status === 'completed') {
        console.log('✅ Action 1 (webhook): Completed');
        console.log('   → Webhook called successfully');
      }

      // Check if action 2 (create data_servizi) succeeded
      if (log.actions_executed[1]?.status === 'completed') {
        console.log('✅ Action 2 (create data_servizi): Completed');
        console.log('   → Record created in data_servizi');
      } else if (log.actions_executed[1]?.status === 'failed') {
        console.log('❌ Action 2 (create data_servizi): FAILED');
        console.log(`   → Error: ${log.actions_executed[1].error}`);
        console.log('\n💡 This is the issue we need to fix!');
      }
    } else if (log.status === 'failed') {
      console.log('\n❌ FAILED! Workflow execution failed');
      console.log(`   Error: ${log.error || 'Unknown error'}`);
    } else {
      console.log(`\n⚠️  Workflow status: ${log.status}`);
    }

    console.log('');
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);

    if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
      console.log('💡 Tip: Set JWT_TOKEN environment variable:');
      console.log('   export JWT_TOKEN="your_token_here"');
      console.log(
        '   Or get it from: Browser > DevTools > Application > Local Storage > access_token\n'
      );
    }

    process.exit(1);
  }
}

testContactUpdate().catch(console.error);
