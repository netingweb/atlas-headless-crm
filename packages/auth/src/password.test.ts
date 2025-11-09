import { hashPassword, verifyPassword } from './password';

describe('Password', () => {
  const testPassword = 'test-password-123';

  it('should hash password', async () => {
    const hash = await hashPassword(testPassword);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(testPassword);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const hash = await hashPassword(testPassword);
    const isValid = await verifyPassword(hash, testPassword);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await hashPassword(testPassword);
    const isValid = await verifyPassword(hash, 'wrong-password');
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password', async () => {
    const hash1 = await hashPassword(testPassword);
    const hash2 = await hashPassword(testPassword);
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty password', async () => {
    const hash = await hashPassword('');
    const isValid = await verifyPassword(hash, '');
    expect(isValid).toBe(true);
  });
});
