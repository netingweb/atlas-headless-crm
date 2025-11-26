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
  // We know the secret is ALWAYS generated from API_KEY_SECRET_LENGTH bytes,
  // so its base64url-encoded length is fixed (API_KEY_SECRET_CHAR_LENGTH).

  if (!key.startsWith('crm_')) {
    return null;
  }

  // Minimum length: "crm_" (4) + prefix (>=1) + "_" (1) + secret (fixed length)
  const minKeyLength = 4 + 1 + 1 + API_KEY_SECRET_CHAR_LENGTH;
  if (key.length < minKeyLength) {
    return null;
  }

  // Secret occupies the last API_KEY_SECRET_CHAR_LENGTH characters
  const secretStartIndex = key.length - API_KEY_SECRET_CHAR_LENGTH;

  // There must be an underscore right before the secret acting as separator
  const separatorIndex = secretStartIndex - 1;
  if (separatorIndex <= 4 || key[separatorIndex] !== '_') {
    return null;
  }

  // Prefix is everything between "crm_" and the separator underscore
  const prefixStart = 4;
  const prefixEnd = separatorIndex;
  if (prefixEnd <= prefixStart) {
    return null;
  }

  const prefix = key.slice(prefixStart, prefixEnd);
  return prefix.length > 0 ? prefix : null;
}

function getBase64UrlLength(byteLength: number): number {
  // Base64url encoding: 3 bytes -> 4 characters, without padding.
  const remainder = byteLength % 3;
  const extraChars = remainder === 1 ? 2 : remainder === 2 ? 3 : 0;
  return Math.floor(byteLength / 3) * 4 + extraChars;
}
