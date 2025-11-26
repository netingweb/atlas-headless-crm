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
  private readonly defaultToken?: string;

  constructor(options: MCPClientOptions) {
    this.defaultToken = options.token;
    this.client = axios.create({
      baseURL: options.baseUrl.replace(/\/$/, ''),
      timeout: options.timeoutMs,
    });
  }

  async listTools(tenantId: string, unitId: string, token?: string): Promise<MCPTool[]> {
    const { data } = await this.client.get<MCPTool[]>(`/${tenantId}/${unitId}/mcp/tools`, {
      headers: this.buildHeaders(token),
    });
    return data;
  }

  async callTool(
    tenantId: string,
    unitId: string,
    toolName: string,
    args: Record<string, unknown>,
    token?: string
  ): Promise<MCPCallResult> {
    const { data } = await this.client.post<MCPCallResult>(
      `/${tenantId}/${unitId}/mcp/call-tool`,
      {
        name: toolName,
        arguments: args,
      },
      {
        headers: this.buildHeaders(token, true),
      }
    );
    return data;
  }

  private buildHeaders(
    token?: string,
    includeContentType = false
  ): Record<string, string> | undefined {
    const resolved = token ?? this.defaultToken;
    if (!resolved && !includeContentType) {
      return includeContentType ? { 'Content-Type': 'application/json' } : undefined;
    }
    const headers: Record<string, string> = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    if (resolved) {
      headers.Authorization = `Bearer ${resolved}`;
    }
    return headers;
  }
}
