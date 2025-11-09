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
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResponse> => {
    try {
      console.log(`[MCP API] Calling tool: ${toolName}`, {
        tenant,
        unit,
        args,
      });

      const response = await apiClient.post<CallToolResponse>(`/${tenant}/${unit}/mcp/call-tool`, {
        name: toolName,
        arguments: args,
      });

      console.log(`[MCP API] Tool ${toolName} response:`, response.data);
      return response.data;
    } catch (error: unknown) {
      console.error(`[MCP API] Error calling tool ${toolName}:`, error);

      // Extract detailed error information
      let errorMessage = 'Unknown error';
      let errorDetails: unknown = null;

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        errorDetails = axiosError.response?.data;
        errorMessage = `Request failed with status code ${axiosError.response?.status || 'unknown'}`;

        if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          const errorData = axiosError.response.data as { message?: string | string[] };
          if (errorData.message) {
            const message = Array.isArray(errorData.message)
              ? errorData.message.join(', ')
              : errorData.message;
            errorMessage = `${errorMessage}: ${message}`;
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack;
      } else {
        errorMessage = String(error);
      }

      console.error(`[MCP API] Error details for ${toolName}:`, {
        message: errorMessage,
        details: errorDetails,
        args,
      });

      // Return error in MCP format
      return {
        content: [
          {
            type: 'text',
            text:
              errorMessage +
              (errorDetails ? `\n\nDetails: ${JSON.stringify(errorDetails, null, 2)}` : ''),
          },
        ],
        isError: true,
      };
    }
  },
};
