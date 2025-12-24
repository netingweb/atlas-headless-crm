import { ChatOpenAI, type ChatOpenAIFields } from '@langchain/openai';
import { createDeepAgent, type SubAgent } from 'deepagents';
import type { AgentDefinition, AgentConfigLoader } from '../config/agent-config-loader.js';
import type { MCPClient } from './mcp-client.js';
import { createLangChainTools, type ToolFilterConfig } from '../tools/mcp-tool-factory.js';
import type { Logger } from '../logger.js';

interface ResolveParams {
  tenantId: string;
  unitId: string;
  agentId: string;
  authToken?: string;
}

type DeepAgentInstance = ReturnType<typeof createDeepAgent>;

export interface AgentContext {
  agent: DeepAgentInstance;
  definition: AgentDefinition;
}

export class AgentRegistry {
  constructor(
    private readonly loader: AgentConfigLoader,
    private readonly mcpClient: MCPClient,
    private readonly logger: Logger
  ) {}

  async resolve(params: ResolveParams): Promise<AgentContext> {
    const definition = await this.loader.getAgent(params.tenantId, params.agentId);
    if (!definition) {
      throw new Error(`Agent "${params.agentId}" not configured for tenant "${params.tenantId}"`);
    }

    if (!params.authToken) {
      this.logger.warn(
        { tenantId: params.tenantId, unitId: params.unitId, agentId: params.agentId },
        '[AgentRegistry] No authToken provided, MCP calls may fail'
      );
    }

    const mcpTools = await this.mcpClient.listTools(
      params.tenantId,
      params.unitId,
      params.authToken
    );
    const tools = createLangChainTools({
      tools: mcpTools,
      filter: definition.tools,
      tenantId: params.tenantId,
      unitId: params.unitId,
      mcpClient: this.mcpClient,
      authToken: params.authToken,
    });

    const subagents = await this.buildSubAgents({
      tenantId: params.tenantId,
      unitId: params.unitId,
      parentId: params.agentId,
      requested: definition.subagents || [],
      mcpTools,
      visited: new Set([params.agentId]),
      authToken: params.authToken,
    });

    const agent = createDeepAgent({
      model: this.createLLM(definition),
      tools,
      systemPrompt: definition.systemPrompt,
      subagents,
      name: definition.id,
    });

    return { agent, definition };
  }

  private createLLM(definition: AgentDefinition): ChatOpenAI {
    if (definition.llm.provider !== 'openai') {
      throw new Error(`Unsupported LLM provider: ${String(definition.llm.provider)}`);
    }

    const apiKey = definition.llm.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        `Missing OpenAI API key for agent "${definition.id}". Provide via config agents.json or OPENAI_API_KEY env variable.`
      );
    }

    const config: ChatOpenAIFields = {
      model: definition.llm.model,
      temperature: definition.llm.temperature ?? 0,
      maxTokens: definition.llm.maxTokens,
      apiKey,
    };

    return new ChatOpenAI(config);
  }

  private async buildSubAgents(params: {
    tenantId: string;
    unitId: string;
    parentId: string;
    requested: Array<{
      agentId: string;
      description?: string;
      systemPrompt?: string;
      allow?: string[];
      deny?: string[];
    }>;
    mcpTools: Awaited<ReturnType<MCPClient['listTools']>>;
    visited: Set<string>;
    authToken?: string;
  }): Promise<SubAgent[]> {
    const { tenantId, unitId, requested, mcpTools, visited, authToken } = params;
    if (!requested || requested.length === 0) {
      return [];
    }

    const subagents: SubAgent[] = [];

    for (const sub of requested) {
      if (visited.has(sub.agentId)) {
        this.logger.warn(
          { subagent: sub.agentId },
          '[AgentRegistry] Skipping subagent to avoid circular reference'
        );
        continue;
      }

      const definition = await this.loader.getAgent(tenantId, sub.agentId);
      if (!definition) {
        this.logger.warn(
          { subagent: sub.agentId },
          '[AgentRegistry] Subagent definition missing in config'
        );
        continue;
      }

      visited.add(sub.agentId);

      const tools = createLangChainTools({
        tools: mcpTools,
        filter: this.mergeToolFilters(definition.tools, sub),
        tenantId,
        unitId,
        mcpClient: this.mcpClient,
        authToken,
      });

      subagents.push({
        name: sub.agentId,
        description: sub.description || definition.description,
        systemPrompt: sub.systemPrompt || definition.systemPrompt,
        model: this.createLLM(definition),
        tools,
      });
    }

    return subagents;
  }

  private mergeToolFilters(
    inherited?: ToolFilterConfig,
    override?: { allow?: string[]; deny?: string[] }
  ): ToolFilterConfig | undefined {
    if (!override?.allow && !override?.deny) {
      return inherited;
    }

    return {
      allow: override.allow ?? inherited?.allow,
      deny: override.deny ?? inherited?.deny,
    };
  }
}
