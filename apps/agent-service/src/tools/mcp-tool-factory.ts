import { DynamicStructuredTool } from '@langchain/core/tools';
import type { MCPClient, MCPTool } from '../services/mcp-client.js';
import { buildZodObjectFromJsonSchema, normalizeToolFilterList, JsonSchema } from '../utils/schema.js';

export interface ToolFilterConfig {
  allow?: string[];
  deny?: string[];
}

function isToolAllowed(name: string, filter?: ToolFilterConfig): boolean {
  if (!filter) return true;

  const allowList = normalizeToolFilterList(filter.allow);
  const denyList = new Set(filter.deny || []);

  if (denyList.has(name)) return false;
  if (allowList.includes('*')) return true;

  return allowList.includes(name);
}

export function createLangChainTools(params: {
  tools: MCPTool[];
  filter?: ToolFilterConfig;
  tenantId: string;
  unitId: string;
  mcpClient: MCPClient;
}): DynamicStructuredTool[] {
  const { tools, filter, tenantId, unitId, mcpClient } = params;

  return tools
    .filter((tool) => isToolAllowed(tool.name, filter))
    .map((tool) => {
      const schema = buildZodObjectFromJsonSchema(tool.inputSchema as JsonSchema);

      return new DynamicStructuredTool({
        name: tool.name,
        description: tool.description,
        schema,
        func: async (rawArgs: Record<string, unknown>) => {
          const validated = schema.parse(rawArgs);
          const result = await mcpClient.callTool(tenantId, unitId, tool.name, validated);

          if (result?.isError) {
            const message =
              result.content
                ?.map((entry: { text: string }) => entry.text)
                .join('\n') ||
              `Tool ${tool.name} failed`;
            throw new Error(message);
          }

          return JSON.stringify(result);
        },
      });
    });
}

