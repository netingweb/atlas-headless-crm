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
  // We know the secret length is always API_KEY_SECRET_CHAR_LENGTH characters
  if (!key.startsWith('crm_')) {
    return null;
  }

  // Minimum key length: "crm_" (4) + prefix (at least 1) + "_" (1) + secret (API_KEY_SECRET_CHAR_LENGTH)
  const minKeyLength = 4 + 1 + 1 + API_KEY_SECRET_CHAR_LENGTH;
  if (key.length < minKeyLength) {
    return null;
  }

  // The secret is always the last API_KEY_SECRET_CHAR_LENGTH characters
  // Before the secret, there must be exactly one underscore separator (inserted during generation)
  const secretStartIndex = key.length - API_KEY_SECRET_CHAR_LENGTH;

  // Verify there's an underscore separator before the secret
  // The separator is at position secretStartIndex - 1
  if (secretStartIndex <= 4) {
    return null;
  }

  const separatorIndex = secretStartIndex - 1;
  if (key[separatorIndex] !== '_') {
    return null;
  }

  // Extract prefix: everything between "crm_" (starts at index 4) and the separator underscore
  // prefixStart = 4 (after "crm_")
  // prefixEnd = separatorIndex (before the separator underscore, exclusive)
  const prefixStart = 4; // After "crm_"
  const prefixEnd = separatorIndex; // Before the separator underscore (exclusive)

  if (prefixEnd <= prefixStart) {
    return null;
  }

  const prefix = key.slice(prefixStart, prefixEnd);
  return prefix.length > 0 ? prefix : null;
}

function getBase64UrlLength(byteLength: number): number {
  // Base64url encoding: 3 bytes -> 4 characters
  // For 32 bytes: 32 / 3 = 10.67 -> 11 groups of 3 bytes = 33 bytes needed
  // But we only have 32 bytes, so: 32 = 10 * 3 + 2 (remainder 2)
  // 10 groups * 4 chars = 40 chars, plus 2 bytes = 3 chars (no padding in base64url)
  // Total: 40 + 3 = 43 characters
  const remainder = byteLength % 3;
  // Base64url doesn't use padding, so we calculate the actual length
  // For remainder 1: 2 chars, remainder 2: 3 chars, remainder 0: 0 extra chars
  const extraChars = remainder === 1 ? 2 : remainder === 2 ? 3 : 0;
  return Math.floor(byteLength / 3) * 4 + extraChars;
}
