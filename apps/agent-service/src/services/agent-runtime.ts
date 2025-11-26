import type { AgentRegistry } from './agent-registry.js';
import type { SessionManager } from './session-manager.js';
import type { TracingFactory } from './tracing-factory.js';
import type { Logger } from '../logger.js';
import type { AgentStreamEvent } from '../streaming/events.js';
import type { AgentDefinition } from '../config/agent-config-loader.js';
import type { AgentSession } from '../types/session.js';
import type { ChatMessage } from '../types/chat.js';

type LangChainStreamEvent = {
  event: string;
  name: string;
  data: {
    input?: unknown;
    output?: Record<string, unknown>;
    chunk?: unknown;
  };
};

interface RunOptions {
  sessionId: string;
  emit: (event: AgentStreamEvent) => void;
  signal?: AbortSignal;
}

export class AgentRuntime {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly sessions: SessionManager,
    private readonly tracingFactory: TracingFactory,
    private readonly logger: Logger
  ) {}

  async run({ sessionId, emit, signal }: RunOptions): Promise<void> {
    const session = this.sessions.getSession(sessionId);
    this.sessions.updateStatus(sessionId, 'running');

    const { agent, definition } = await this.registry.resolve({
      tenantId: session.tenantId,
      unitId: session.unitId,
      agentId: session.agentId,
      authToken: session.authToken,
    });

    const tracing = await this.tracingFactory.create({
      tenantId: session.tenantId,
      unitId: session.unitId,
      sessionId: session.id,
      definition,
      metadata: {
        viewContext: session.viewContext,
        userMetadata: session.metadata,
      },
    });

    emit({
      type: 'session_started',
      data: {
        sessionId: session.id,
        agentId: session.agentId,
        tenantId: session.tenantId,
        unitId: session.unitId,
      },
    });

    if (tracing) {
      emit({
        type: 'tracing',
        data: {
          runUrl: await tracing.getRunUrl(),
        },
      });
    }

    const abortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort(signal.reason), {
        once: true,
      });
    }

    let finalMessage = '';
    let usage: Record<string, unknown> | undefined;

    try {
      const stream = (await agent.streamEvents(
        {
          messages: this.buildMessages(session, definition),
        },
        {
          version: 'v2',
          signal: abortController.signal,
          configurable: {
            thread_id: session.id,
          },
        }
      )) as AsyncIterable<LangChainStreamEvent>;

      for await (const event of stream) {
        this.forwardEvent(event, emit);
        const extracted = this.extractFinalMessage(event);
        if (extracted) {
          finalMessage = extracted.content ?? finalMessage;
          usage = extracted.usage ?? usage;
        }
      }

      this.sessions.updateStatus(sessionId, 'completed');
      emit({
        type: 'done',
        data: { finalMessage, usage },
      });
      await tracing?.finalize({ finalMessage, usage });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        { err: error, sessionId, agentId: session.agentId },
        '[AgentRuntime] Session failed'
      );
      this.sessions.updateStatus(sessionId, 'failed', message);
      emit({
        type: 'error',
        data: { message },
      });
      await tracing?.finalize(undefined, error as Error);
      throw error;
    }
  }

  private forwardEvent(event: LangChainStreamEvent, emit: (evt: AgentStreamEvent) => void): void {
    switch (event.event) {
      case 'on_chat_model_stream': {
        const chunk = this.extractChunkContent(event.data?.chunk);
        if (chunk) {
          emit({
            type: 'message',
            data: {
              role: 'assistant',
              content: chunk,
              chunk: true,
            },
          });
        }
        break;
      }
      case 'on_tool_start': {
        if (event.name === 'write_todos') {
          emit({
            type: 'plan_step',
            data: {
              status: 'started',
              detail: this.extractPlanDetail(event.data?.input),
            },
          });
        }
        if (event.name === 'task') {
          emit({
            type: 'subagent_call',
            data: {
              agent: this.extractSubAgentName(event.data?.input),
              input: event.data?.input,
            },
          });
        }
        emit({
          type: 'tool_call',
          data: {
            toolName: event.name,
            input: event.data?.input,
          },
        });
        break;
      }
      case 'on_tool_end': {
        if (event.name === 'write_todos') {
          emit({
            type: 'plan_step',
            data: {
              status: 'completed',
              detail: this.extractPlanDetail(event.data?.output ?? event.data?.chunk),
            },
          });
        }
        emit({
          type: 'tool_result',
          data: {
            toolName: event.name,
            output: event.data?.output ?? event.data?.chunk,
          },
        });
        break;
      }
      default:
        break;
    }
  }

  private extractChunkContent(chunk: unknown): string {
    if (!chunk) return '';
    if (typeof chunk === 'string') return chunk;
    if (Array.isArray(chunk)) {
      return chunk
        .map((entry: unknown) => {
          if (typeof entry === 'string') return entry;
          if (entry && typeof entry === 'object' && 'text' in entry) {
            return String((entry as { text: unknown }).text ?? '');
          }
          return '';
        })
        .join('');
    }
    if (typeof chunk === 'object' && 'content' in chunk) {
      return this.extractChunkContent((chunk as { content: unknown }).content);
    }
    return '';
  }

  private extractFinalMessage(
    event: LangChainStreamEvent
  ): { content?: string; usage?: Record<string, unknown> } | null {
    if (event.event !== 'on_chain_end' && event.event !== 'on_chat_model_end') {
      return null;
    }

    const output = event.data?.output;
    if (!output) {
      return null;
    }

    let content: string | undefined;
    if (Array.isArray(output.messages)) {
      const assistantMessages = (
        output.messages as Array<{ role?: string; content?: unknown }>
      ).filter((msg: { role?: string }) => msg.role === 'assistant');
      const last =
        assistantMessages.at(-1) ?? (output.messages as Array<{ content?: unknown }>).at(-1);
      if (last && 'content' in last && last.content) {
        content = this.extractChunkContent(last.content);
      }
    } else if (output.content) {
      content = this.extractChunkContent(output.content);
    }

    const usage = (output.usage_metadata || output.usage) as Record<string, unknown> | undefined;

    return { content, usage };
  }

  private buildMessages(session: AgentSession, definition: AgentDefinition): ChatMessage[] {
    const systemMessages: ChatMessage[] = [
      {
        role: 'system',
        content: definition.systemPrompt,
      },
    ];

    const contextPrompt = this.buildContextPrompt(session);
    if (contextPrompt) {
      systemMessages.push({
        role: 'system',
        content: contextPrompt,
      });
    }

    return [...systemMessages, ...session.messages];
  }

  private buildContextPrompt(session: AgentSession): string | null {
    const parts: string[] = [];
    if (session.viewContext?.route) {
      parts.push(`Current route: ${session.viewContext.route}`);
    }
    if (session.viewContext?.entityType) {
      parts.push(
        `Focused entity: ${session.viewContext.entityType} ${
          session.viewContext.entityId ? `(${session.viewContext.entityId})` : ''
        }`.trim()
      );
    }
    if (session.metadata && Object.keys(session.metadata).length > 0) {
      parts.push(`User metadata: ${JSON.stringify(session.metadata)}`);
    }
    return parts.length > 0 ? parts.join('\n') : null;
  }

  private extractPlanDetail(input: unknown): string {
    if (!input) {
      return 'Planning next steps';
    }
    if (typeof input === 'string') {
      return input;
    }
    if (Array.isArray(input)) {
      return input.map((item) => this.extractPlanDetail(item)).join('\n');
    }
    if (typeof input === 'object') {
      if ('todos' in input && Array.isArray((input as { todos: unknown }).todos)) {
        return (input as { todos: unknown[] }).todos
          .map((todo, idx) => `${idx + 1}. ${this.extractPlanDetail(todo)}`)
          .join('\n');
      }
      try {
        return JSON.stringify(input, null, 2);
      } catch {
        return String(input);
      }
    }
    return String(input);
  }

  private extractSubAgentName(input: unknown): string {
    if (!input || typeof input !== 'object') {
      return 'subagent';
    }
    const candidate =
      (input as Record<string, unknown>).agent ||
      (input as Record<string, unknown>).agentId ||
      (input as Record<string, unknown>).agent_name;
    return typeof candidate === 'string' ? candidate : 'subagent';
  }
}
