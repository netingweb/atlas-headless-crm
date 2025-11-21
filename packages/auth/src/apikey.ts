import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

const API_KEY_PREFIX_LENGTH = 8;
const API_KEY_SECRET_LENGTH = 32;

export interface ApiKeyParts {
  fullKey: string;
  prefix: string;
  secret: string;
}

export function generateApiKey(): ApiKeyParts {
  const secret = randomBytes(API_KEY_SECRET_LENGTH).toString('base64url');
  const prefix = randomBytes(API_KEY_PREFIX_LENGTH).toString('base64url');
  const fullKey = `crm_${prefix}_${secret}`;
  return { fullKey, prefix, secret };
}

export async function hashApiKey(key: string): Promise<string> {
  return argon2.hash(key, {
    type: argon2.argon2id,
    memoryCost: 32768,
    timeCost: 2,
    parallelism: 2,
  });
}

export async function verifyApiKey(hash: string, key: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, key);
  } catch {
    return false;
  }
}

export function extractPrefix(key: string): string | null {
  // Format is: crm_${prefix}_${secret}
  // Prefix and secret can contain underscores from base64url encoding
  // So we need to find the first underscore after 'crm' and the last underscore
  if (!key.startsWith('crm_')) {
    return null;
  }

  // Find the first underscore (after 'crm')
  const firstUnderscore = key.indexOf('_', 0);
  if (firstUnderscore === -1) {
    return null;
  }

  // Find the last underscore (before secret)
  const lastUnderscore = key.lastIndexOf('_');
  if (lastUnderscore === firstUnderscore || lastUnderscore === -1) {
    return null;
  }

  // Extract prefix: everything between first and last underscore
  const prefix = key.substring(firstUnderscore + 1, lastUnderscore);
  return prefix || null;
}
