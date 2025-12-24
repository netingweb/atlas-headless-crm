/**
 * Script per testare l'esecuzione manuale di un workflow tramite API
 *
 * Usage:
 *   pnpm tsx scripts/trigger-workflow-manual.ts [contact_id] [email]
 *
 * Example:
 *   pnpm tsx scripts/trigger-workflow-manual.ts 67474c6e6e5d70ea8b7c0881 mario.rossi@example.com
 */

const TENANT = 'demo';
const UNIT = 'sales';
const WORKFLOW_ID = 'dd071a43-858b-4749-b8db-66c443b24c7b'; // Aggiorna servizi attivi contact
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Token JWT - Ottienilo dal browser (Developer Tools > Application > Local Storage > access_token)
const JWT_TOKEN = process.env.JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';

interface TriggerResponse {
  execution_id: string;
  message: string;
}

interface ExecutionLog {
  log_id: string;
  execution_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  actions_executed: Array<{
    action_index: number;
    action_type: string;
    status: string;
    result?: unknown;
    error?: string;
  }>;
  error?: string;
}

async function triggerWorkflow(contactId: string, email: string): Promise<void> {
  console.log('\n🚀 Triggering workflow manually...');
  console.log(`📋 Workflow ID: ${WORKFLOW_ID}`);
  console.log(`👤 Contact ID: ${contactId}`);
  console.log(`📧 Email: ${email}\n`);

  const url = `${API_URL}/${TENANT}/${UNIT}/workflows/${WORKFLOW_ID}/run`;

  try {
    // Step 1: Trigger workflow
    console.log('📤 Sending request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        context: {
          entity_id: contactId,
          entity: 'contact',
          data: {
            email: email,
            name: 'Test Contact',
          },
        },
        actor: 'manual_test',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result: TriggerResponse = await response.json();

    console.log('✅ Workflow triggered successfully!');
    console.log(`🆔 Execution ID: ${result.execution_id}`);
    console.log(`💬 Message: ${result.message}\n`);

    // Step 2: Wait a bit for execution
    console.log('⏳ Waiting for execution (5 seconds)...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Check execution logs
    console.log('📊 Fetching execution logs...\n');
    const logsUrl = `${API_URL}/${TENANT}/${UNIT}/workflows/${WORKFLOW_ID}/executions?limit=1`;

    const logsResponse = await fetch(logsUrl, {
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    if (logsResponse.ok) {
      const logs: ExecutionLog[] = await logsResponse.json();

      if (logs.length > 0) {
        const log = logs[0];

        console.log(`📋 Execution Log:`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Started: ${log.started_at}`);
        console.log(`   Completed: ${log.completed_at || 'N/A'}\n`);

        if (log.actions_executed && log.actions_executed.length > 0) {
          console.log(`🔧 Actions Executed (${log.actions_executed.length}):\n`);

          for (const action of log.actions_executed) {
            console.log(`   Action ${action.action_index} - ${action.action_type}:`);
            console.log(`     Status: ${action.status}`);

            if (action.status === 'completed' && action.result) {
              console.log(`     Result:`);
              console.log(
                `       ${JSON.stringify(action.result, null, 2).split('\n').join('\n       ')}`
              );
            }

            if (action.status === 'failed' && action.error) {
              console.log(`     ❌ Error: ${action.error}`);
            }
            console.log('');
          }
        }

        if (log.error) {
          console.log(`❌ Workflow Error: ${log.error}\n`);
        }

        // Check if data_servizi was created
        if (log.status === 'completed') {
          console.log('✅ Workflow completed successfully!');
          console.log('🔍 Check data_servizi entity in the database for the new record.\n');
        }
      }
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);

    if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
      console.log(
        '💡 Tip: Set JWT_TOKEN environment variable or update the script with a valid token.'
      );
      console.log(
        '   You can get it from: Browser > Developer Tools > Application > Local Storage > access_token\n'
      );
    }

    process.exit(1);
  }
}

// Parse command line arguments
const contactId = process.argv[2] || '67474c6e6e5d70ea8b7c0881';
const email = process.argv[3] || 'test@example.com';

triggerWorkflow(contactId, email).catch(console.error);
