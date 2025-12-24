import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { config } from 'dotenv';

// Load .env from project root (monorepo root)
// Try multiple strategies to find the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strategy 1: If we're in apps/agent-service/src or dist, go up to project root
let projectRoot: string | null = null;
if (__dirname.includes('apps/agent-service')) {
  projectRoot = path.resolve(__dirname, '../../../..');
}

// Strategy 2: Try process.cwd() (works when run from project root)
if (!projectRoot || !fs.existsSync(path.join(projectRoot, '.env'))) {
  const cwdRoot = process.cwd();
  if (fs.existsSync(path.join(cwdRoot, '.env'))) {
    projectRoot = cwdRoot;
  }
}

// Strategy 3: Walk up from current directory looking for .env
if (!projectRoot) {
  let currentDir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(currentDir, '.env');
    if (fs.existsSync(candidate)) {
      projectRoot = currentDir;
      break;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
}

if (projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  const result = config({ path: envPath });
  if (!result.error) {
    console.log(`[Agent Service] Loaded .env from ${envPath}`);
  }
}

console.log(`[Agent Service] OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);

export interface EnvConfig {
  port: number;
  host: string;
  logLevel: string;
  mcpApiBaseUrl: string;
  mcpServiceToken?: string;
  agentConfigRoot: string;
  requestTimeoutMs: number;
  jwtSecret?: string;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadEnv(): EnvConfig {
  const port = parseNumber(process.env.AGENT_SERVICE_PORT, 4100);
  const host = process.env.AGENT_SERVICE_HOST || '0.0.0.0';
  const logLevel = process.env.AGENT_SERVICE_LOG_LEVEL || 'info';
  const mcpApiBaseUrl = process.env.MCP_API_BASE_URL || 'http://localhost:3000/api';
  const mcpServiceToken = process.env.MCP_SERVICE_TOKEN || process.env.AGENT_SERVICE_API_TOKEN;
  const agentConfigRoot = process.env.AGENT_CONFIG_ROOT || path.resolve(process.cwd(), 'config');
  const requestTimeoutMs = parseNumber(process.env.AGENT_SERVICE_TIMEOUT_MS, 60000);
  const jwtSecret = process.env.AGENT_SERVICE_JWT_SECRET || process.env.JWT_SECRET;

  return {
    port,
    host,
    logLevel,
    mcpApiBaseUrl,
    mcpServiceToken,
    agentConfigRoot,
    requestTimeoutMs,
    jwtSecret,
  };
}
