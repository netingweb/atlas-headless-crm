/**
 * Storage abstraction interface for multi-tenant document storage
 * Supports MinIO (local) and AWS S3 (roadmap)
 */

export interface StorageConfig {
  type: 'minio' | 's3';
  config: MinIOConfig | S3Config;
}

export interface MinIOConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  bucket: string;
  port?: number;
  region?: string;
}

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageFile {
  path: string;
  size: number;
  contentType: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string,
    buffer: Buffer,
    options?: UploadOptions
  ): Promise<string>;

  /**
   * Download a file from storage
   */
  download(tenantId: string, unitId: string, documentId: string, filename: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  delete(tenantId: string, unitId: string, documentId: string, filename: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(tenantId: string, unitId: string, documentId: string, filename: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getMetadata(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string
  ): Promise<StorageFile>;

  /**
   * Get presigned URL for temporary access (if supported)
   */
  getPresignedUrl?(
    tenantId: string,
    unitId: string,
    documentId: string,
    filename: string,
    expiresIn?: number
  ): Promise<string>;
}
