import { Client as LangSmithClient } from 'langsmith';
import { RunTree } from 'langsmith/run_trees';
import type { AgentDefinition } from '../config/agent-config-loader.js';
import type { Logger } from '../logger.js';

export interface TracingContext {
  runTree: RunTree;
  client: LangSmithClient;
  finalize: (outputs?: Record<string, unknown>, error?: Error) => Promise<void>;
  getRunUrl: () => Promise<string | undefined>;
}

interface CreateTracingInput {
  tenantId: string;
  unitId: string;
  sessionId: string;
  definition: AgentDefinition;
  metadata?: Record<string, unknown>;
}

export class TracingFactory {
  constructor(private readonly logger: Logger) {}

  async create(input: CreateTracingInput): Promise<TracingContext | null> {
    const { definition } = input;
    const tracing = definition.tracing;
    if (!tracing || !tracing.enabled || tracing.provider !== 'langsmith') {
      return null;
    }

    const apiKey =
      tracing.variables?.LANGCHAIN_API_KEY || process.env.LANGCHAIN_API_KEY || undefined;
    if (!apiKey) {
      this.logger.warn(
        { agentId: definition.id },
        '[TracingFactory] LangSmith tracing enabled but LANGCHAIN_API_KEY is missing'
      );
      return null;
    }

    const client = new LangSmithClient({
      apiKey,
      apiUrl: tracing.variables?.LANGSMITH_API_URL || process.env.LANGSMITH_API_URL,
      webUrl: tracing.variables?.LANGSMITH_WEB_URL || process.env.LANGSMITH_WEB_URL,
    });

    const runTree = new RunTree({
      name: `${definition.id}::${input.sessionId}`,
      run_type: 'chain',
      project_name:
        tracing.variables?.LANGCHAIN_PROJECT ||
        process.env.LANGCHAIN_PROJECT ||
        'agent-service',
      client,
      tags: [
        ...(tracing.defaultTags || []),
        `tenant:${input.tenantId}`,
        `unit:${input.unitId}`,
        `agent:${definition.id}`,
      ],
      metadata: {
        ...tracing.metadata,
        ...input.metadata,
      },
      inputs: {},
    });

    return {
      runTree,
      client,
      finalize: async (outputs?: Record<string, unknown>, error?: Error) => {
        await runTree.end(outputs, error?.message, Date.now(), outputs);
      },
      getRunUrl: async () => {
        try {
          return client.getRunUrl({ runId: runTree.id, projectOpts: { projectName: runTree.project_name } });
        } catch (error) {
          this.logger.warn(
            { err: error, runId: runTree.id },
            '[TracingFactory] Unable to retrieve LangSmith run URL'
          );
          return undefined;
        }
      },
    };
  }
}

