import { signJwt, verifyJwt, decodeJwt } from './jwt';
import type { JwtPayload } from '@crm-atlas/types';

describe('JWT', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: 'user123',
    tenant_id: 'acme',
    unit_id: 'sales',
    roles: ['admin'],
    scopes: ['crm:read', 'crm:write'],
  };

  it('should sign JWT token', () => {
    const token = signJwt(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify valid JWT token', () => {
    const token = signJwt(payload);
    const verified = verifyJwt(token);

    expect(verified.sub).toBe(payload.sub);
    expect(verified.tenant_id).toBe(payload.tenant_id);
    expect(verified.unit_id).toBe(payload.unit_id);
    expect(verified.roles).toEqual(payload.roles);
    expect(verified.scopes).toEqual(payload.scopes);
  });

  it('should throw error for invalid token', () => {
    expect(() => {
      verifyJwt('invalid.token.here');
    }).toThrow();
  });

  it('should decode JWT token', () => {
    const token = signJwt(payload);
    const decoded = decodeJwt(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(payload.sub);
    expect(decoded?.tenant_id).toBe(payload.tenant_id);
  });

  it('should return null for invalid token when decoding', () => {
    const decoded = decodeJwt('invalid.token.here');
    expect(decoded).toBeNull();
  });
});
