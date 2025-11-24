import { loadEnv } from './env.js';
import { createLogger } from './logger.js';
import { AgentConfigLoader } from './config/agent-config-loader.js';
import { MCPClient } from './services/mcp-client.js';
import { SessionManager } from './services/session-manager.js';
import { AgentRegistry } from './services/agent-registry.js';
import { TracingFactory } from './services/tracing-factory.js';
import { AgentRuntime } from './services/agent-runtime.js';
import { AuthVerifier } from './services/auth-verifier.js';
import { createServer } from './server.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env.logLevel);

  const configLoader = new AgentConfigLoader(env.agentConfigRoot);
  const mcpClient = new MCPClient({
    baseUrl: env.mcpApiBaseUrl,
    token: env.mcpServiceToken,
    timeoutMs: env.requestTimeoutMs,
  });

  const sessions = new SessionManager();
  const tracingFactory = new TracingFactory(logger);
  const registry = new AgentRegistry(configLoader, mcpClient, logger);
  const runtime = new AgentRuntime(registry, sessions, tracingFactory, logger);
  const authVerifier = new AuthVerifier(env.jwtSecret, logger);

  const server = createServer({
    logger,
    sessions,
    runtime,
    auth: authVerifier,
  });

  await server.listen({
    port: env.port,
    host: env.host,
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, closing server');
    await server.close();
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[AgentService] Fatal error during startup', error);
  process.exit(1);
});

