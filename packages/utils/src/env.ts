import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Load .env from the monorepo root, regardless of the current working directory.
 * It walks up from process.cwd() until it finds a .env file, up to repository root.
 */
export function loadRootEnv(): void {
  try {
    let dir = process.cwd();
    // Walk up max 6 levels which covers typical monorepo depths
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(dir, '.env');
      if (fs.existsSync(candidate)) {
        dotenv.config({ path: candidate });
        return;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    // Fallback: standard dotenv (may still find a local .env)
    dotenv.config();
  } catch {
    // Silent fail: never block app boot if .env is missing
  }
}
