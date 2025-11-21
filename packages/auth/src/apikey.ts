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
  // Format is: crm_${prefix}_${secret}
  // Prefix and secret can contain underscores from base64url encoding
  if (!key.startsWith('crm_')) {
    return null;
  }

  if (key.length <= 4 + 1 + API_KEY_SECRET_CHAR_LENGTH) {
    return null;
  }

  const secretStart = key.length - API_KEY_SECRET_CHAR_LENGTH;
  if (key[secretStart - 1] !== '_') {
    return null;
  }

  const prefix = key.slice(4, secretStart - 1);
  return prefix.length > 0 ? prefix : null;
}

function getBase64UrlLength(byteLength: number): number {
  const fullLength = Math.ceil(byteLength / 3) * 4;
  const remainder = byteLength % 3;
  const padding = remainder === 0 ? 0 : 3 - remainder;
  return fullLength - padding;
}
