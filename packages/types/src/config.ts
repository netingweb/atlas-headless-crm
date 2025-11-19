import { z } from 'zod';
import { EntityDefinitionSchema } from './entities';

export const StorageConfigSchema = z.object({
  type: z.enum(['minio', 's3']),
  config: z.record(z.unknown()),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export const VisionProviderSchema = z.object({
  name: z.enum(['openai', 'claude']),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

export type VisionProvider = z.infer<typeof VisionProviderSchema>;

export const DocumentProcessingConfigSchema = z.object({
  maxFileSize: z.number().optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
  chunkingDefaults: z
    .object({
      chunkSize: z.number(),
      chunkOverlap: z.number(),
    })
    .optional(),
});

export type DocumentProcessingConfig = z.infer<typeof DocumentProcessingConfigSchema>;

export const TenantConfigSchema = z.object({
  tenant_id: z.string(),
  name: z.string(),
  settings: z.record(z.unknown()).optional(),
  embeddingsProvider: z
    .object({
      name: z.enum(['openai', 'jina', 'local']),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      baseUrl: z.string().optional(),
    })
    .optional(),
  storage: StorageConfigSchema.optional(),
  visionProvider: VisionProviderSchema.optional(),
  documentProcessing: DocumentProcessingConfigSchema.optional(),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;

export const UnitConfigSchema = z.object({
  unit_id: z.string(),
  name: z.string(),
  tenant_id: z.string(),
  settings: z.record(z.unknown()).optional(),
});

export type UnitConfig = z.infer<typeof UnitConfigSchema>;

export const EntitiesConfigSchema = z.object({
  tenant_id: z.string(),
  entities: z.array(EntityDefinitionSchema),
});

export type EntitiesConfig = z.infer<typeof EntitiesConfigSchema>;

export const PermissionSchema = z.object({
  role: z.string(),
  scopes: z.array(z.string()),
});

export type Permission = z.infer<typeof PermissionSchema>;

export const PermissionsConfigSchema = z.object({
  tenant_id: z.string(),
  roles: z.array(PermissionSchema),
});

export type PermissionsConfig = z.infer<typeof PermissionsConfigSchema>;
