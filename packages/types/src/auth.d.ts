import { z } from 'zod';
export declare const UserSchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    tenant_id: z.ZodString;
    unit_id: z.ZodString;
    email: z.ZodString;
    passwordHash: z.ZodString;
    roles: z.ZodArray<z.ZodString, 'many'>;
    scopes: z.ZodArray<z.ZodString, 'many'>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    unit_id: string;
    email: string;
    passwordHash: string;
    roles: string[];
    scopes: string[];
    created_at: Date;
    updated_at: Date;
    _id?: string | undefined;
  },
  {
    tenant_id: string;
    unit_id: string;
    email: string;
    passwordHash: string;
    roles: string[];
    scopes: string[];
    created_at: Date;
    updated_at: Date;
    _id?: string | undefined;
  }
>;
export type User = z.infer<typeof UserSchema>;
export declare const ApiKeySchema: z.ZodObject<
  {
    _id: z.ZodOptional<z.ZodString>;
    tenant_id: z.ZodString;
    unit_id: z.ZodOptional<z.ZodString>;
    app_id: z.ZodOptional<z.ZodString>;
    keyHash: z.ZodString;
    keyPrefix: z.ZodString;
    scopes: z.ZodArray<z.ZodString, 'many'>;
    expires_at: z.ZodOptional<z.ZodDate>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    scopes: string[];
    created_at: Date;
    updated_at: Date;
    keyHash: string;
    keyPrefix: string;
    _id?: string | undefined;
    unit_id?: string | undefined;
    app_id?: string | undefined;
    expires_at?: Date | undefined;
  },
  {
    tenant_id: string;
    scopes: string[];
    created_at: Date;
    updated_at: Date;
    keyHash: string;
    keyPrefix: string;
    _id?: string | undefined;
    unit_id?: string | undefined;
    app_id?: string | undefined;
    expires_at?: Date | undefined;
  }
>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export declare const JwtPayloadSchema: z.ZodObject<
  {
    sub: z.ZodString;
    tenant_id: z.ZodString;
    unit_id: z.ZodString;
    roles: z.ZodArray<z.ZodString, 'many'>;
    scopes: z.ZodArray<z.ZodString, 'many'>;
    iat: z.ZodOptional<z.ZodNumber>;
    exp: z.ZodOptional<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    unit_id: string;
    roles: string[];
    scopes: string[];
    sub: string;
    iat?: number | undefined;
    exp?: number | undefined;
  },
  {
    tenant_id: string;
    unit_id: string;
    roles: string[];
    scopes: string[];
    sub: string;
    iat?: number | undefined;
    exp?: number | undefined;
  }
>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export type Scope = string;
//# sourceMappingURL=auth.d.ts.map
