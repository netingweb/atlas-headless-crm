import { generateApiKey, hashApiKey, verifyApiKey, extractPrefix } from './apikey';

describe('API Key', () => {
  it('should generate API key with correct format', () => {
    const { fullKey, prefix, secret } = generateApiKey();

    expect(fullKey).toMatch(/^crm_[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+$/);
    expect(prefix).toBeDefined();
    expect(secret).toBeDefined();
    expect(fullKey).toBe(`crm_${prefix}_${secret}`);
  });

  it('should generate unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.fullKey).not.toBe(key2.fullKey);
  });

  it('should hash API key', async () => {
    const { fullKey } = generateApiKey();
    const hash = await hashApiKey(fullKey);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(fullKey);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct API key', async () => {
    const { fullKey } = generateApiKey();
    const hash = await hashApiKey(fullKey);
    const isValid = await verifyApiKey(hash, fullKey);

    expect(isValid).toBe(true);
  });

  it('should reject incorrect API key', async () => {
    const { fullKey } = generateApiKey();
    const hash = await hashApiKey(fullKey);
    const isValid = await verifyApiKey(hash, 'wrong-key');

    expect(isValid).toBe(false);
  });

  it('should extract prefix from valid API key', () => {
    const { fullKey, prefix } = generateApiKey();
    const extracted = extractPrefix(fullKey);

    expect(extracted).toBe(prefix);
  });

  it('should return null for invalid API key format', () => {
    expect(extractPrefix('invalid-key')).toBeNull();
    expect(extractPrefix('crm_invalid')).toBeNull();
    expect(extractPrefix('not_crm_prefix')).toBeNull();
  });
});
