export interface ApiKeyParts {
  fullKey: string;
  prefix: string;
  secret: string;
}
export declare function generateApiKey(): ApiKeyParts;
export declare function hashApiKey(key: string): Promise<string>;
export declare function verifyApiKey(hash: string, key: string): Promise<boolean>;
export declare function extractPrefix(key: string): string | null;
//# sourceMappingURL=apikey.d.ts.map
