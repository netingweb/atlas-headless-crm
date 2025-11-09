import { ValidatorCache } from './validation';
import type { EntityDefinition } from '@crm-atlas/types';

describe('ValidatorCache', () => {
  let cache: ValidatorCache;

  beforeEach(() => {
    cache = new ValidatorCache();
  });

  const createEntityDef = (): EntityDefinition => ({
    name: 'test',
    fields: [
      {
        name: 'name',
        type: 'string',
        required: true,
        indexed: false,
        searchable: false,
        embeddable: false,
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        indexed: false,
        searchable: false,
        embeddable: false,
      },
      {
        name: 'age',
        type: 'number',
        required: false,
        indexed: false,
        searchable: false,
        embeddable: false,
      },
    ],
  });

  it('should compile and cache validator', () => {
    const entityDef = createEntityDef();
    const validator = cache.getOrCompile('tenant1', 'test', entityDef);

    expect(validator).toBeDefined();
    expect(typeof validator).toBe('function');
  });

  it('should validate correct data', () => {
    const entityDef = createEntityDef();
    const validator = cache.getOrCompile('tenant1', 'test', entityDef);

    const valid = validator({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    });

    expect(valid).toBe(true);
  });

  it('should reject invalid data', () => {
    const entityDef = createEntityDef();
    const validator = cache.getOrCompile('tenant1', 'test', entityDef);

    const valid = validator({
      name: 'John Doe',
      // Missing required email
    });

    expect(valid).toBe(false);
    expect(validator.errors).toBeDefined();
    expect(validator.errors?.length).toBeGreaterThan(0);
  });

  it('should reject invalid email format', () => {
    const entityDef = createEntityDef();
    const validator = cache.getOrCompile('tenant1', 'test', entityDef);

    const valid = validator({
      name: 'John Doe',
      email: 'invalid-email',
    });

    expect(valid).toBe(false);
  });

  it('should reuse cached validator', () => {
    const entityDef = createEntityDef();
    const validator1 = cache.getOrCompile('tenant1', 'test', entityDef);
    const validator2 = cache.getOrCompile('tenant1', 'test', entityDef);

    expect(validator1).toBe(validator2);
  });

  it('should clear cache for specific tenant', () => {
    const entityDef = createEntityDef();
    const validator1 = cache.getOrCompile('tenant1', 'test', entityDef);
    cache.clear('tenant1');
    const validator2 = cache.getOrCompile('tenant1', 'test', entityDef);

    expect(validator1).not.toBe(validator2);
  });

  it('should clear all cache', () => {
    const entityDef = createEntityDef();
    const validator1 = cache.getOrCompile('tenant1', 'test', entityDef);
    cache.clear();
    const validator2 = cache.getOrCompile('tenant1', 'test', entityDef);

    expect(validator1).not.toBe(validator2);
  });
});
