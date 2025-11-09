import { MongoClient, Db } from 'mongodb';
import { logger } from '@crm-atlas/utils';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(uri: string, dbName: string): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    logger.info('MongoDB connected', { dbName });
    return db;
  } catch (error) {
    logger.error('MongoDB connection failed', error as Error);
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongo first.');
  }
  return db;
}
