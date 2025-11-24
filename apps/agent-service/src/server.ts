import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Logger } from './logger.js';
import type { SessionManager } from './services/session-manager.js';
import type { AgentRuntime } from './services/agent-runtime.js';
import { SSEStream } from './http/sse.js';
import { chatRequestSchema } from './http/schemas.js';
import type { AgentStreamEvent } from './streaming/events.js';
import type { AuthVerifier } from './services/auth-verifier.js';

interface ServerDependencies {
  logger: Logger;
  sessions: SessionManager;
  runtime: AgentRuntime;
  auth: AuthVerifier;
}

export function createServer(deps: ServerDependencies): FastifyInstance {
  const app = Fastify({
    logger: {
      level: deps.logger.level,
    },
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.post<{
    Params: { agentId?: string };
    Body: Record<string, unknown>;
  }>('/v1/agents/:agentId/chat', async (request, reply) => {
    const payload = chatRequestSchema.parse({
      ...request.body,
      agentId: request.params.agentId ?? request.body?.agentId,
    });

    const authContext = deps.auth.verify({
      authorizationHeader: request.headers.authorization,
    });

    if (deps.auth.isEnabled() && !authContext) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    if (
      !deps.auth.isTenantAuthorized(authContext, payload.tenantId, payload.unitId)
    ) {
      reply.code(403).send({ error: 'Forbidden for tenant/unit' });
      return;
    }

    const session = deps.sessions.createSession({
      ...payload,
      metadata: {
        ...(payload.metadata || {}),
        userId: authContext?.userId,
        roles: authContext?.roles,
        scopes: authContext?.scopes,
      },
    });

    reply.code(201).send({
      sessionId: session.id,
    });
  });

  app.get<{
    Params: { agentId: string; sessionId: string };
    Querystring: { token?: string };
  }>('/v1/agents/:agentId/sessions/:sessionId/stream', async (request, reply) => {
    const { agentId, sessionId } = request.params;
    let session;
    try {
      session = deps.sessions.getSession(sessionId);
    } catch {
      reply.code(404).send({ error: 'Session not found' });
      return;
    }
    if (session.agentId !== agentId) {
      reply.code(400).send({ error: 'Session agent mismatch' });
      return;
    }

    const authContext = deps.auth.verify({
      authorizationHeader: request.headers.authorization,
      tokenParam: request.query.token,
    });
    if (deps.auth.isEnabled() && !authContext) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    if (!deps.auth.isSessionAuthorized(authContext, session)) {
      reply.code(403).send({ error: 'Forbidden for tenant/unit' });
      return;
    }

    const stream = new SSEStream(reply);
    stream.open();

    const abortController = new AbortController();
    request.raw.on('close', () => abortController.abort());

    try {
      await deps.runtime.run({
        sessionId,
        signal: abortController.signal,
        emit: (event: AgentStreamEvent) => {
          stream.send(event);
        },
      });
    } catch (error) {
      if (!abortController.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        stream.send({
          type: 'error',
          data: { message },
        });
      }
    } finally {
      stream.close();
    }
  });

  return app;
}

