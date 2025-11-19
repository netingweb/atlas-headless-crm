import type { StorageProvider, StorageConfig } from './storage.interface';
import { MinIOStorageProvider } from './minio-storage';
import { S3StorageProvider } from './s3-storage';

/**
 * Factory to create storage provider based on configuration
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.type) {
    case 'minio':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new MinIOStorageProvider(config.config as any);
    case 's3':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new S3StorageProvider(config.config as any);
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unsupported storage type: ${String(config.type)}`);
  }
}
