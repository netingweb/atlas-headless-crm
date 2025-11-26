import path from 'node:path';
import { AgentRuntime } from './agent-runtime';
import { SessionManager } from './session-manager';
import type { AgentRegistry } from './agent-registry';
import type { TracingFactory, TracingContext } from './tracing-factory';
import { AgentConfigLoader } from '../config/agent-config-loader';
import type { Logger } from '../logger';
import type { AgentStreamEvent } from '../streaming/events';

const CONFIG_ROOT = path.resolve(__dirname, '../../../..', 'config');
const loader = new AgentConfigLoader(CONFIG_ROOT);

const noopLogger: Logger = {
  level: 'silent',
  child: () => noopLogger,
  fatal: () => noopLogger,
  error: () => noopLogger,
  warn: () => noopLogger,
  info: () => noopLogger,
  debug: () => noopLogger,
  trace: () => noopLogger,
  silent: () => noopLogger,
  bindings: () => ({}),
};

const ORIGINAL_ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
  LANGSMITH_API_URL: process.env.LANGSMITH_API_URL,
  LANGSMITH_WEB_URL: process.env.LANGSMITH_WEB_URL,
};

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.LANGCHAIN_API_KEY = 'test-langsmith-key';
  process.env.LANGSMITH_API_URL = 'http://langsmith.local';
  process.env.LANGSMITH_WEB_URL = 'http://langsmith.local/web';
});

afterAll(() => {
  process.env.OPENAI_API_KEY = ORIGINAL_ENV.OPENAI_API_KEY;
  process.env.LANGCHAIN_API_KEY = ORIGINAL_ENV.LANGCHAIN_API_KEY;
  process.env.LANGSMITH_API_URL = ORIGINAL_ENV.LANGSMITH_API_URL;
  process.env.LANGSMITH_WEB_URL = ORIGINAL_ENV.LANGSMITH_WEB_URL;
});

describe('AgentRuntime multi-tenant coverage', () => {
  const tenants = [
    { tenantId: 'demo', unitId: 'sales' },
    { tenantId: 'demo2', unitId: 'it' },
    { tenantId: 'demo3', unitId: 'global' },
  ] as const;

  it.each(tenants)(
    'streams responses and finalizes sessions for tenant %s',
    async ({ tenantId, unitId }) => {
      const definition = await loader.getAgent(tenantId, 'crm_orchestrator');
      expect(definition).not.toBeNull();
      if (!definition) {
        return;
      }

      const fakeAgent = createStreamingAgent([
        {
          event: 'on_chat_model_stream',
          name: 'chat',
          data: { chunk: `Risposta parziale ${tenantId}` },
        },
        {
          event: 'on_chat_model_end',
          name: 'chat',
          data: {
            output: {
              messages: [{ role: 'assistant', content: `Risposta finale ${tenantId}` }],
              usage_metadata: { output_tokens: 32 },
            },
          },
        },
      ]);

      const registry = {
        resolve: jest.fn().mockResolvedValue({
          agent: fakeAgent,
          definition,
        }),
      } as unknown as AgentRegistry;

      const tracingContext = definition.tracing?.enabled
        ? createTracingContext(`https://langsmith.local/${tenantId}`)
        : null;

      const tracingFactory = {
        create: jest.fn().mockImplementation(() => Promise.resolve(tracingContext)),
      } as unknown as TracingFactory;

      const sessions = new SessionManager();
      const runtime = new AgentRuntime(registry, sessions, tracingFactory, noopLogger);

      const session = sessions.createSession({
        tenantId,
        unitId,
        agentId: 'crm_orchestrator',
        messages: [{ role: 'user', content: `Parla del tenant ${tenantId}` }],
        viewContext: {
          entityType: 'contact',
          entityId: 'contact-1',
          route: '/contacts/contact-1',
        },
        metadata: { locale: 'it-IT' },
      });

      const emitted: AgentStreamEvent[] = [];
      await runtime.run({
        sessionId: session.id,
        emit: (event) => emitted.push(event),
      });

      const streamCall = (fakeAgent.streamEvents as jest.Mock).mock.calls[0];
      const streamMessages = streamCall[0].messages;
      expect(streamMessages[0]).toEqual({
        role: 'system',
        content: definition.systemPrompt,
      });

      const sessionStarted = emitted.find((event) => event.type === 'session_started');
      expect(sessionStarted?.data).toMatchObject({ tenantId, unitId });

      const messageEvent = emitted.find((event) => event.type === 'message');
      expect(messageEvent?.data.content).toContain(tenantId);

      const doneEvent = emitted.find((event) => event.type === 'done');
      expect(doneEvent?.data.finalMessage).toBe(`Risposta finale ${tenantId}`);
      expect(doneEvent?.data.usage).toMatchObject({ output_tokens: 32 });

      if (definition.tracing?.enabled) {
        const tracingEvent = emitted.find((event) => event.type === 'tracing');
        expect(tracingEvent?.data.runUrl).toContain(tenantId);
        expect(tracingContext?.getRunUrl).toHaveBeenCalledTimes(1);
        expect(tracingContext?.finalize).toHaveBeenCalledWith({
          finalMessage: `Risposta finale ${tenantId}`,
          usage: { output_tokens: 32 },
        });
      } else {
        expect(emitted.find((event) => event.type === 'tracing')).toBeUndefined();
      }

      const updatedSession = sessions.getSession(session.id);
      expect(updatedSession.status).toBe('completed');
      expect(updatedSession.lastError).toBeUndefined();
    }
  );

  it('emits error events and marks session as failed on agent crash', async () => {
    const tenantId = 'demo2';
    const unitId = 'sales';
    const definition = await loader.getAgent(tenantId, 'crm_orchestrator');
    expect(definition).not.toBeNull();
    if (!definition) {
      return;
    }

    const failure = new Error('LangChain crash');
    const failingAgent = createFailingAgent(failure);

    const registry = {
      resolve: jest.fn().mockResolvedValue({
        agent: failingAgent,
        definition,
      }),
    } as unknown as AgentRegistry;

    const tracingContext = createTracingContext('https://langsmith.local/error');
    const tracingFactory = {
      create: jest.fn().mockResolvedValue(tracingContext),
    } as unknown as TracingFactory;

    const sessions = new SessionManager();
    const runtime = new AgentRuntime(registry, sessions, tracingFactory, noopLogger);

    const session = sessions.createSession({
      tenantId,
      unitId,
      agentId: 'crm_orchestrator',
      messages: [{ role: 'user', content: 'Forza un errore' }],
    });

    const emitted: AgentStreamEvent[] = [];
    await expect(
      runtime.run({
        sessionId: session.id,
        emit: (event) => emitted.push(event),
      })
    ).rejects.toThrow('LangChain crash');

    const errorEvent = emitted.find((event) => event.type === 'error');
    expect(errorEvent?.data.message).toContain('LangChain crash');

    const updatedSession = sessions.getSession(session.id);
    expect(updatedSession.status).toBe('failed');
    expect(updatedSession.lastError).toContain('LangChain crash');

    expect(tracingContext.finalize).toHaveBeenCalledWith(undefined, failure);
  });
});

function createStreamingAgent(
  events: Array<{ event: string; name: string; data: Record<string, unknown> }>
): {
  streamEvents: jest.Mock<
    Promise<AsyncGenerator<{ event: string; name: string; data: Record<string, unknown> }>>
  >;
} {
  return {
    streamEvents: jest.fn().mockResolvedValue(
      (async function* generator(): AsyncGenerator<{
        event: string;
        name: string;
        data: Record<string, unknown>;
      }> {
        for (const event of events) {
          yield event;
        }
      })()
    ),
  };
}

function createFailingAgent(error: Error): {
  streamEvents: jest.Mock<Promise<AsyncIterable<never>>>;
} {
  const failingIterable: AsyncIterable<never> = {
    [Symbol.asyncIterator]: () => {
      return {
        async next(): Promise<IteratorResult<never>> {
          throw error;
        },
      };
    },
  };

  return {
    streamEvents: jest.fn().mockResolvedValue(failingIterable),
  };
}

function createTracingContext(runUrl: string): TracingContext & {
  finalize: jest.Mock;
  getRunUrl: jest.Mock;
} {
  return {
    runTree: undefined as unknown as TracingContext['runTree'],
    client: undefined as unknown as TracingContext['client'],
    finalize: jest.fn().mockResolvedValue(undefined),
    getRunUrl: jest.fn().mockResolvedValue(runUrl),
  };
}
