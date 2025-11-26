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
  // Expected format: crm_${prefix}_${secret}
  // Both prefix and secret are base64url strings and may contain underscores.
  // A simple and robust way to extract the prefix is to rely on a regex that:
  // - enforces the "crm_" prefix
  // - captures everything up to the LAST underscore as the prefix
  // - treats everything after the last underscore as the secret
  //
  // Example:
  //   crm_e_pf9XiIfNw_bb7X44xP69xC1rIJ280yaHPhQGWLebp9Fs7JGc2fCiM
  //   prefix: e_pf9XiIfNw
  //   secret: bb7X44xP69xC1rIJ280yaHPhQGWLebp9Fs7JGc2fCiM
  const match = /^crm_([a-zA-Z0-9_-]+)_[a-zA-Z0-9_-]+$/.exec(key);
  if (!match) {
    return null;
  }
  const prefix = match[1];
  return prefix.length > 0 ? prefix : null;
}
