import { z } from 'zod';

export const UserSchema = z.object({
  _id: z.string().optional(),
  tenant_id: z.string(),
  unit_id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  roles: z.array(z.string()),
  scopes: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const ApiKeySchema = z.object({
  _id: z.string().optional(),
  tenant_id: z.string(),
  unit_id: z.string().optional(),
  app_id: z.string().optional(),
  keyHash: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  expires_at: z.date().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string(),
  tenant_id: z.string(),
  unit_id: z.string(),
  roles: z.array(z.string()),
  scopes: z.array(z.string()),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export type Scope = string;
