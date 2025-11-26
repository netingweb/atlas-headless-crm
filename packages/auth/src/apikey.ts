import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

const API_KEY_PREFIX_LENGTH = 8;
const API_KEY_SECRET_LENGTH = 32;
const API_KEY_SECRET_CHAR_LENGTH = getBase64UrlLength(API_KEY_SECRET_LENGTH);

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
  // Expected format: crm_${prefix}_${secret}
  // Both prefix and secret are base64url strings and may contain underscores.
  // We:
  // 1. Strip the "crm_" prefix
  // 2. Split from the END on the last underscore
  //    - Everything before it is the prefix (can contain underscores, including as first char)
  //    - Everything after it is the secret (should have fixed length)

  if (!key.startsWith('crm_')) {
    return null;
  }

  const rest = key.slice(4); // remove "crm_"
  const lastSeparator = rest.lastIndexOf('_');

  // We need at least 1 char for prefix and 1 for secret
  if (lastSeparator <= 0 || lastSeparator === rest.length - 1) {
    return null;
  }

  const prefix = rest.slice(0, lastSeparator);
  const secret = rest.slice(lastSeparator + 1);

  // Basic validation on secret length (should match what generateApiKey produces)
  if (secret.length !== API_KEY_SECRET_CHAR_LENGTH) {
    return null;
  }

  return prefix.length > 0 ? prefix : null;
}

function getBase64UrlLength(byteLength: number): number {
  // Base64url encoding: 3 bytes -> 4 characters, without padding.
  const remainder = byteLength % 3;
  const extraChars = remainder === 1 ? 2 : remainder === 2 ? 3 : 0;
  return Math.floor(byteLength / 3) * 4 + extraChars;
}
