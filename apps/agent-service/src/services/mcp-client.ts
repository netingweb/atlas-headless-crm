import axios, { AxiosInstance } from 'axios';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPCallResult {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
  [key: string]: unknown;
}

export interface MCPClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs: number;
}

export class MCPClient {
  private readonly client: AxiosInstance;

  constructor(options: MCPClientOptions) {
    this.client = axios.create({
      baseURL: options.baseUrl.replace(/\/$/, ''),
      timeout: options.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    });
  }

  async listTools(tenantId: string, unitId: string): Promise<MCPTool[]> {
    const { data } = await this.client.get<MCPTool[]>(`/${tenantId}/${unitId}/mcp/tools`);
    return data;
  }

  async callTool(
    tenantId: string,
    unitId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPCallResult> {
    const { data } = await this.client.post<MCPCallResult>(
      `/${tenantId}/${unitId}/mcp/call-tool`,
      {
        name: toolName,
        arguments: args,
      }
    );
    return data;
  }
}

