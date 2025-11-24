import path from 'node:path';
import 'dotenv/config';

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
  const agentConfigRoot =
    process.env.AGENT_CONFIG_ROOT || path.resolve(process.cwd(), 'config');
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

