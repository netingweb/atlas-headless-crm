import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ToolFilterConfig } from '../tools/mcp-tool-factory.js';

const LLMProviderSchema = z.enum(['openai']);

const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  apiKey: z.string().optional(),
});

const ToolFilterSchema = z
  .object({
    allow: z.array(z.string()).min(1).optional(),
    deny: z.array(z.string()).optional(),
  })
  .optional();

const SubAgentSchema = z.object({
  agentId: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

const TracingSchema = z
  .object({
    provider: z.literal('langsmith'),
    enabled: z.boolean().optional().default(true),
    variables: z.record(z.string()).optional(),
    defaultTags: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .optional();

const AgentSchema = z.object({
  type: z.enum(['standard', 'orchestrator', 'subagent']).default('standard'),
  description: z.string(),
  systemPrompt: z.string(),
  llm: LLMConfigSchema,
  tools: ToolFilterSchema,
  subagents: z.array(SubAgentSchema).optional(),
  tracing: TracingSchema,
});

const AgentsFileSchema = z.object({
  agents: z.record(AgentSchema),
});

const ENV_PATTERN = /^\$\{env:([A-Z0-9_]+)\}$/i;

function resolveEnv(value?: string): string | undefined {
  if (!value) return value;
  const match = value.match(ENV_PATTERN);
  if (!match) return value;
  const envValue = process.env[match[1]];
  if (!envValue) {
    throw new Error(`Missing environment variable ${match[1]} referenced in agents.json`);
  }
  return envValue;
}

export interface AgentLLMSettings {
  provider: z.infer<typeof LLMProviderSchema>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface AgentTracingSettings {
  provider: 'langsmith';
  enabled: boolean;
  variables: Record<string, string>;
  defaultTags: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentDefinition {
  id: string;
  type: 'standard' | 'orchestrator' | 'subagent';
  description: string;
  systemPrompt: string;
  llm: AgentLLMSettings;
  tools?: ToolFilterConfig;
  subagents?: Array<{
    agentId: string;
    description?: string;
    systemPrompt?: string;
    allow?: string[];
    deny?: string[];
  }>;
  tracing?: AgentTracingSettings;
}

interface TenantAgentsCache {
  mtimeMs: number;
  config: z.infer<typeof AgentsFileSchema>;
}

export class AgentConfigLoader {
  private readonly cache = new Map<string, TenantAgentsCache>();

  constructor(private readonly rootDir: string) {}

  async getAgent(tenantId: string, agentId: string): Promise<AgentDefinition | null> {
    const config = await this.loadTenantFile(tenantId);
    const agent = config.agents[agentId];
    if (!agent) {
      return null;
    }

    return {
      id: agentId,
      type: agent.type,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      llm: {
        provider: agent.llm.provider,
        model: agent.llm.model,
        temperature: agent.llm.temperature,
        maxTokens: agent.llm.maxTokens,
        apiKey: resolveEnv(agent.llm.apiKey),
      },
      tools: agent.tools
        ? {
            allow: agent.tools.allow,
            deny: agent.tools.deny,
          }
        : undefined,
      subagents: agent.subagents,
      tracing: agent.tracing
        ? {
            provider: 'langsmith',
            enabled: agent.tracing.enabled ?? true,
            variables: Object.fromEntries(
              Object.entries(agent.tracing.variables || {}).map(([key, val]) => [
                key,
                resolveEnv(val) ?? val,
              ])
            ),
            defaultTags: agent.tracing.defaultTags || [],
            metadata: agent.tracing.metadata,
          }
        : undefined,
    };
  }

  private async loadTenantFile(tenantId: string): Promise<z.infer<typeof AgentsFileSchema>> {
    const filePath = path.join(this.rootDir, tenantId, 'agents.json');
    let stats: Stats;
    try {
      stats = await fs.stat(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Missing agent configuration file for tenant "${tenantId}" at ${filePath}`);
      }
      throw error;
    }
    const cached = this.cache.get(filePath);
    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.config;
    }

    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = AgentsFileSchema.parse(JSON.parse(raw));
    this.cache.set(filePath, { mtimeMs: stats.mtimeMs, config: parsed });
    return parsed;
  }
}

