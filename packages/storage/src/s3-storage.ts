import type { StorageProvider, StorageFile, UploadOptions, S3Config } from './storage.interface';

/**
 * AWS S3 storage provider implementation (Roadmap)
 * Placeholder for future S3 support
 */
export class S3StorageProvider implements StorageProvider {
  constructor(_config: S3Config) {
    // TODO: Initialize AWS S3 client when implementing
    throw new Error('S3 storage provider not yet implemented. This is a roadmap feature.');
  }

  async upload(
    _tenantId: string,
    _unitId: string,
    _documentId: string,
    _filename: string,
    _buffer: Buffer,
    _options?: UploadOptions
  ): Promise<string> {
    throw new Error('S3 storage provider not yet implemented');
  }

  async download(
    _tenantId: string,
    _unitId: string,
    _documentId: string,
    _filename: string
  ): Promise<Buffer> {
    throw new Error('S3 storage provider not yet implemented');
  }

  async delete(
    _tenantId: string,
    _unitId: string,
    _documentId: string,
    _filename: string
  ): Promise<void> {
    throw new Error('S3 storage provider not yet implemented');
  }

  async exists(
    _tenantId: string,
    _unitId: string,
    _documentId: string,
    _filename: string
  ): Promise<boolean> {
    throw new Error('S3 storage provider not yet implemented');
  }

  async getMetadata(
    _tenantId: string,
    _unitId: string,
    _documentId: string,
    _filename: string
  ): Promise<StorageFile> {
    throw new Error('S3 storage provider not yet implemented');
  }
}
