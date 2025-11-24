import jwt from 'jsonwebtoken';
import { AuthVerifier } from './auth-verifier';
import type { Logger } from '../logger';

const noopLogger: Logger = {
  level: 'silent',
  child: () => noopLogger,
  fatal: () => noopLogger,
  error: () => noopLogger,
  warn: () => noopLogger,
  info: () => noopLogger,
  debug: () => noopLogger,
  trace: () => noopLogger,
  silent: () => noopLogger,
  bindings: () => ({}),
};

describe('AuthVerifier', () => {
  const secret = 'test-secret';

  it('verifies valid tokens and enforces tenant/unit', () => {
    const verifier = new AuthVerifier(secret, noopLogger);
    const token = jwt.sign(
      {
        sub: 'user-1',
        tenant_id: 'demo',
        unit_id: 'sales',
        roles: ['admin'],
        scopes: ['read'],
      },
      secret
    );

    const ctx = verifier.verify({ authorizationHeader: `Bearer ${token}` });
    expect(ctx).not.toBeNull();
    expect(ctx?.tenantId).toBe('demo');
    expect(
      verifier.isTenantAuthorized(
        ctx,
        'demo',
        'sales'
      )
    ).toBe(true);
    expect(
      verifier.isTenantAuthorized(
        ctx,
        'demo',
        'support'
      )
    ).toBe(false);
  });

  it('returns null for invalid tokens', () => {
    const verifier = new AuthVerifier(secret, noopLogger);
    const ctx = verifier.verify({ authorizationHeader: 'Bearer invalid-token' });
    expect(ctx).toBeNull();
  });

  it('allows requests when auth is disabled', () => {
    const verifier = new AuthVerifier(undefined, noopLogger);
    expect(verifier.verify({ authorizationHeader: undefined })).toBeNull();
    expect(verifier.isTenantAuthorized(null, 'any', 'unit')).toBe(true);
  });
});

