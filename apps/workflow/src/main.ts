import { connectMongo } from '@crm-atlas/db';
import { WorkflowEngine } from './workflow-engine';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

async function main(): Promise<void> {
  try {
    await connectMongo(mongoUri, dbName);
    console.log('✅ Connesso a MongoDB');

    const engine = new WorkflowEngine();
    await engine.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Ricevuto SIGINT, arresto...');
      await engine.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Ricevuto SIGTERM, arresto...');
      await engine.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Errore avvio Workflow Engine:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
