import { loadRootEnv } from '@crm-atlas/utils';
import { connectMongo, getDb } from '@crm-atlas/db';
import { MongoConfigLoader } from '@crm-atlas/config';
import { getEmbeddableFields, concatFields } from '@crm-atlas/utils';
import {
  ensureCollection,
  upsertDocument,
  deleteDocument,
  upsertQdrantPoint,
  deleteQdrantPoint,
  ensureQdrantCollection,
} from '@crm-atlas/search';
import { createEmbeddingsProvider, getProviderConfig } from '@crm-atlas/embeddings';
import type { EntityDefinition } from '@crm-atlas/types';
import { MongoClient, ChangeStream, ObjectId } from 'mongodb';
import {
  buildQdrantPayload,
  buildTenantContext,
  buildTypesenseDocument,
  isGlobalEntity,
  normalizeDocument,
  resolveMongoCollectionName,
} from './typesense-helpers';
import { ensureEmbeddingsApiKey } from './embeddings-config';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';

interface ChangeEvent {
  operationType: 'insert' | 'update' | 'replace' | 'delete';
  fullDocument?: Record<string, unknown>;
  documentKey: { _id: unknown };
  ns: { db: string; coll: string };
}

class IndexerService {
  private client: MongoClient | null = null;
  private changeStreams: Map<string, ChangeStream> = new Map();
  private configLoader: MongoConfigLoader;
  private isRunning = false;
  private watchedGlobalEntities: Set<string> = new Set();

  constructor() {
    this.configLoader = new MongoConfigLoader(getDb());
  }

  async start(): Promise<void> {
    loadRootEnv();
    if (this.isRunning) {
      console.log('⚠️  Indexer già in esecuzione');
      return;
    }

    console.log('🚀 Avvio Indexer Service...');
    this.isRunning = true;

    // Connect to MongoDB
    this.client = await MongoClient.connect(mongoUri);

    // Get all tenants
    const tenants = await this.configLoader.getTenants();
    console.log(`📋 Trovati ${tenants.length} tenant(s)`);

    // Start change streams for each tenant/unit/entity combination
    for (const tenant of tenants) {
      const units = await this.configLoader.getUnits(tenant.tenant_id);
      console.log(`  Tenant: ${tenant.tenant_id} (${units.length} unit(s))`);

      for (const unit of units) {
        const entities = await this.configLoader.getEntities({
          tenant_id: tenant.tenant_id,
          unit_id: unit.unit_id,
        });

        for (const entity of entities) {
          const isGlobal = isGlobalEntity(entity);
          const globalKey = `${tenant.tenant_id}:${entity.name}`;

          if (isGlobal && this.watchedGlobalEntities.has(globalKey)) {
            continue;
          }

          await this.startChangeStream(
            tenant.tenant_id,
            isGlobal ? null : unit.unit_id,
            entity.name,
            entity
          );

          if (isGlobal) {
            this.watchedGlobalEntities.add(globalKey);
          }
        }
      }
    }

    console.log('✅ Indexer Service avviato');
    console.log(`📊 Monitoring ${this.changeStreams.size} collection(s)`);
  }

  private async startChangeStream(
    tenantId: string,
    unitId: string | null,
    entity: string,
    entityDef: EntityDefinition
  ): Promise<void> {
    const isGlobal = isGlobalEntity(entityDef);
    const collName = resolveMongoCollectionName(tenantId, unitId, entity, entityDef);
    const ctx = buildTenantContext(tenantId, unitId);
    const db = getDb();
    const collection = db.collection(collName);

    try {
      const tenantConfig = await this.configLoader.getTenant(tenantId);
      // Ensure collections exist in Typesense and Qdrant
      await ensureCollection(ctx, entity, entityDef);

      const embeddableFields = getEmbeddableFields(entityDef);
      if (embeddableFields.length > 0) {
        ensureEmbeddingsApiKey(tenantId, tenantConfig?.embeddingsProvider);
        const globalConfig = getProviderConfig();
        const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);
        const [sampleVector] = await provider.embedTexts(['sample']);
        await ensureQdrantCollection(tenantId, entity, sampleVector.length);
      }

      // Start change stream with updateLookup to get full document after updates
      // Note: fullDocument might still be null for some updates, so we fetch directly if needed
      const changeStream = collection.watch([], {
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable',
      });

      changeStream.on('change', async (change: ChangeEvent) => {
        try {
          await this.handleChange(change, tenantId, unitId, entity, entityDef);
        } catch (error) {
          console.error(
            `❌ Errore processando change per ${collName}:`,
            error instanceof Error ? error.message : error
          );
        }
      });

      changeStream.on('error', (error) => {
        console.error(`❌ Errore change stream per ${collName}:`, error);
      });

      const streamKey = `${tenantId}:${unitId ?? 'global'}:${entity}`;
      this.changeStreams.set(streamKey, changeStream);
      console.log(`  ✓ Monitoring: ${collName} (${isGlobal ? 'global' : unitId})`);
    } catch (error) {
      console.error(`❌ Errore avvio change stream per ${collName}:`, error);
    }
  }

  private async handleChange(
    change: ChangeEvent,
    tenantId: string,
    unitId: string | null,
    entity: string,
    entityDef: EntityDefinition
  ): Promise<void> {
    const ctx = buildTenantContext(tenantId, unitId);
    const docId = String(change.documentKey._id);

    if (change.operationType === 'delete') {
      // Remove from indexes
      await deleteDocument(ctx, entity, docId, entityDef);

      const embeddableFields = getEmbeddableFields(entityDef);
      if (embeddableFields.length > 0) {
        await deleteQdrantPoint(tenantId, entity, docId);
      }

      console.log(`  🗑️  Deleted: ${entity}/${docId}`);
      return;
    }

    // Insert or update
    let doc = change.fullDocument;

    // For updates, always fetch the document directly to ensure we have the latest data
    // This prevents race conditions where fullDocument might contain stale data
    if (change.operationType === 'update' || change.operationType === 'replace') {
      const db = getDb();
      const collName = resolveMongoCollectionName(tenantId, unitId, entity, entityDef);
      const collection = db.collection(collName);
      // Convert _id to ObjectId if needed
      const docIdObj =
        change.documentKey._id instanceof ObjectId
          ? change.documentKey._id
          : new ObjectId(String(change.documentKey._id));

      // Small delay to ensure MongoDB has committed the update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fetchedDoc = await collection.findOne({ _id: docIdObj });

      if (!fetchedDoc) {
        console.warn(`⚠️  Document not found after update for ${entity}/${docId}`);
        return;
      }

      doc = fetchedDoc as Record<string, unknown>;
      console.log(`  🔄 Fetched latest document for ${entity}/${docId}`);
    }

    if (!doc) {
      console.warn(`⚠️  No document available in change event for ${entity}/${docId}`);
      return;
    }

    // Index in Typesense with latest document data
    // Prepare document for Typesense (ensure id is string and remove MongoDB _id)
    const normalizedDoc = normalizeDocument(doc as Record<string, unknown>);
    const typesenseDoc = buildTypesenseDocument(normalizedDoc, docId, tenantId, unitId, entityDef);

    await upsertDocument(ctx, entity, typesenseDoc, entityDef);

    // Index in Qdrant if has embeddable fields
    const embeddableFields = getEmbeddableFields(entityDef);
    if (embeddableFields.length > 0) {
      const tenantConfig = await this.configLoader.getTenant(tenantId);
      ensureEmbeddingsApiKey(tenantId, tenantConfig?.embeddingsProvider);
      const globalConfig = getProviderConfig();
      const provider = createEmbeddingsProvider(globalConfig, tenantConfig?.embeddingsProvider);

      const textToEmbed = concatFields(normalizedDoc, embeddableFields);
      if (textToEmbed.trim()) {
        const [vector] = await provider.embedTexts([textToEmbed]);
        const payload = buildQdrantPayload(normalizedDoc, tenantId, unitId, entityDef);
        await upsertQdrantPoint(tenantId, entity, {
          id: docId,
          vector,
          payload,
        });
      }
    }

    console.log(`  ✅ Indexed: ${entity}/${docId} (${change.operationType})`);
  }

  async stop(): Promise<void> {
    console.log('🛑 Arresto Indexer Service...');

    for (const [collName, stream] of this.changeStreams.entries()) {
      await stream.close();
      console.log(`  ✓ Closed stream: ${collName}`);
    }

    this.changeStreams.clear();
    this.watchedGlobalEntities.clear();

    if (this.client) {
      await this.client.close();
    }

    this.isRunning = false;
    console.log('✅ Indexer Service arrestato');
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongo(mongoUri, dbName);
    console.log('✅ Connesso a MongoDB');

    const indexer = new IndexerService();
    await indexer.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Ricevuto SIGINT, arresto...');
      await indexer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Ricevuto SIGTERM, arresto...');
      await indexer.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Errore avvio Indexer:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
