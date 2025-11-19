import * as MinIO from 'minio';
import type { StorageProvider, StorageFile, UploadOptions, MinIOConfig } from './storage.interface';

/**
 * MinIO storage provider implementation
 */
export class MinIOStorageProvider implements StorageProvider {
  private client: MinIO.Client;
  private bucket: string;

  constructor(config: MinIOConfig) {
    this.bucket = config.bucket;
    this.client = new MinIO.Client({
      endPoint: config.endpoint.split(':')[0],
      port:
        config.port ||
        (config.endpoint.includes(':') ? parseInt(config.endpoint.split(':')[1]) : 9000),
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region || 'us-east-1',
    });
  }

  /**
   * Ensure bucket exists, create if it doesn't
   */
  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  /**
   * Build object path: {tenant_id}/{unit_id}/documents/{document_id}/{filename}
   */
  private buildPath(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string
  ): string {
    return `${tenantId}/${unitId}/documents/${documentId}/${filename}`;
  }

  async upload(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string,
    buffer: Buffer,
    options?: UploadOptions
  ): Promise<string> {
    await this.ensureBucket();

    const objectPath = this.buildPath(tenantId, unitId, documentId, filename);
    const metadata: Record<string, string> = {
      ...options?.metadata,
      'x-tenant-id': tenantId,
      'x-unit-id': unitId,
      'x-document-id': documentId,
    };

    await this.client.putObject(this.bucket, objectPath, buffer, buffer.length, {
      'Content-Type': options?.contentType || 'application/octet-stream',
      ...metadata,
    });

    return objectPath;
  }

  async download(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string
  ): Promise<Buffer> {
    const objectPath = this.buildPath(tenantId, unitId, documentId, filename);
    const stream = await this.client.getObject(this.bucket, objectPath);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async delete(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string
  ): Promise<void> {
    const objectPath = this.buildPath(tenantId, unitId, documentId, filename);
    await this.client.removeObject(this.bucket, objectPath);
  }

  async exists(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string
  ): Promise<boolean> {
    try {
      const objectPath = this.buildPath(tenantId, unitId, documentId, filename);
      await this.client.statObject(this.bucket, objectPath);
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string
  ): Promise<StorageFile> {
    const objectPath = this.buildPath(tenantId, unitId, documentId, filename);
    const stat = await this.client.statObject(this.bucket, objectPath);

    return {
      path: objectPath,
      size: stat.size,
      contentType: stat.metaData['content-type'] || 'application/octet-stream',
      lastModified: stat.lastModified,
      metadata: stat.metaData,
    };
  }

  async getPresignedUrl(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const objectPath = this.buildPath(tenantId, unitId, documentId, filename);
    return await this.client.presignedGetObject(this.bucket, objectPath, expiresIn);
  }
}
