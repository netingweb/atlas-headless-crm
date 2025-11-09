import { apiClient } from './client';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface CallToolRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface CallToolResponse {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

export const mcpApi = {
  listTools: async (tenant: string, unit: string): Promise<MCPTool[]> => {
    const response = await apiClient.get<MCPTool[]>(`/${tenant}/${unit}/mcp/tools`);
    return response.data;
  },

  callTool: async (
    tenant: string,
    unit: string,
    request: CallToolRequest
  ): Promise<CallToolResponse> => {
    const response = await apiClient.post<CallToolResponse>(
      `/${tenant}/${unit}/mcp/call-tool`,
      request
    );
    return response.data;
  },
};
