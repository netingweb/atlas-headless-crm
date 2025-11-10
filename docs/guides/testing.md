# Testing Guide

## Overview

Atlas CRM Headless usa Jest come framework di test. Ogni package ha la sua configurazione Jest e può essere testato indipendentemente.

## Struttura Test

```
packages/
  core/
    src/
      errors.test.ts
      validation.test.ts
  utils/
    src/
      helpers.test.ts
  auth/
    src/
      password.test.ts
      jwt.test.ts
      apikey.test.ts
  config/
    src/
      cache.test.ts
apps/
  api/
    src/
      health/
        health.controller.test.ts
```

## Comandi Test

### Eseguire tutti i test

```bash
pnpm test
```

### Test con coverage

```bash
pnpm test:coverage
```

### Test in watch mode (solo API)

```bash
pnpm test:watch
```

### Test di un package specifico

```bash
pnpm --filter @crm-atlas/core test
pnpm --filter @crm-atlas/auth test:coverage
```

## Tipi di Test

### Unit Test

Test isolati per funzioni e classi singole:

- `packages/core/src/errors.test.ts` - Test per errori custom
- `packages/auth/src/password.test.ts` - Test per hashing password
- `packages/utils/src/helpers.test.ts` - Test per utility functions

### Integration Test

Test che verificano l'integrazione tra componenti:

- `packages/config/src/cache.test.ts` - Test per cache di configurazione
- `apps/api/src/health/health.controller.test.ts` - Test per controller NestJS

## Best Practices

1. **Naming**: Usa `.test.ts` come suffisso per i file di test
2. **Coverage**: Obiettivo minimo 80% per questa fase
3. **Isolamento**: Ogni test deve essere indipendente
4. **Mock**: Usa mock per dipendenze esterne (DB, API, etc.)
5. **Setup/Teardown**: Usa `beforeEach` e `afterEach` per cleanup

## Esempio Test

```typescript
import { hashPassword, verifyPassword } from './password';

describe('Password', () => {
  it('should hash password', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('test123');
  });

  it('should verify correct password', async () => {
    const hash = await hashPassword('test123');
    const isValid = await verifyPassword(hash, 'test123');
    expect(isValid).toBe(true);
  });
});
```

## Coverage Report

Dopo aver eseguito `pnpm test:coverage`, puoi visualizzare il report HTML:

```bash
open coverage/lcov-report/index.html
```

## Test in CI/CD

I test vengono eseguiti automaticamente in CI/CD con:

- Lint check
- Type check
- Test con coverage
- Build verification
