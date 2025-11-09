import { z } from 'zod';
import { EntityDefinitionSchema } from './entities';

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
