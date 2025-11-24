const DEFAULT_AGENT_SERVICE_URL =
  import.meta.env.VITE_AGENT_SERVICE_URL || 'http://localhost:4100';

export type AgentServiceEventType =
  | 'session_started'
  | 'message'
  | 'plan_step'
  | 'tool_call'
  | 'tool_result'
  | 'subagent_call'
  | 'tracing'
  | 'error'
  | 'done';

export interface AgentServiceEvent<T = unknown> {
  type: AgentServiceEventType;
  data: T;
}

export interface AgentServiceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ViewContextPayload {
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
}

export interface StartAgentSessionPayload {
  agentId: string;
  tenantId: string;
  unitId: string;
  messages: AgentServiceMessage[];
  viewContext?: ViewContextPayload;
  metadata?: Record<string, unknown>;
  baseUrl?: string;
  authToken?: string | null;
}

export interface AgentSessionInfo {
  sessionId: string;
  agentId: string;
  streamUrl: string;
  baseUrl: string;
}

function resolveBaseUrl(input?: string): string {
  return (input || DEFAULT_AGENT_SERVICE_URL).replace(/\/$/, '');
}

export async function startAgentSession(
  payload: StartAgentSessionPayload
): Promise<AgentSessionInfo> {
  const baseUrl = resolveBaseUrl(payload.baseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (payload.authToken) {
    headers.Authorization = `Bearer ${payload.authToken}`;
  }

  const response = await fetch(`${baseUrl}/v1/agents/${payload.agentId}/chat`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      tenantId: payload.tenantId,
      unitId: payload.unitId,
      agentId: payload.agentId,
      messages: payload.messages,
      viewContext: payload.viewContext,
      metadata: payload.metadata,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Unable to start agent session (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const data = (await response.json()) as { sessionId: string };
  const tokenQuery = payload.authToken ? `?token=${encodeURIComponent(payload.authToken)}` : '';

  return {
    sessionId: data.sessionId,
    agentId: payload.agentId,
    baseUrl,
    streamUrl: `${baseUrl}/v1/agents/${payload.agentId}/sessions/${data.sessionId}/stream${tokenQuery}`,
  };
}

export function subscribeToAgentStream(params: {
  streamUrl: string;
  onEvent: (event: AgentServiceEvent) => void;
  onError: (error: Error) => void;
}): () => void {
  const eventSource = new EventSource(params.streamUrl, { withCredentials: true });
  const eventTypes: AgentServiceEventType[] = [
    'session_started',
    'message',
    'plan_step',
    'tool_call',
    'tool_result',
    'subagent_call',
    'tracing',
    'error',
    'done',
  ];

  const listeners: Partial<Record<AgentServiceEventType, (event: MessageEvent<string>) => void>> =
    {};

  eventTypes.forEach((type) => {
    const listener = (event: MessageEvent<string>) => {
      try {
        const payload = event.data ? JSON.parse(event.data) : {};
        params.onEvent({ type, data: payload });
      } catch (error) {
        console.error('[AgentService] Failed to parse stream event', error);
      }
    };
    listeners[type] = listener;
    eventSource.addEventListener(type, listener);
  });

  eventSource.onerror = () => {
    eventSource.close();
    params.onError(new Error('Agent stream connection lost'));
  };

  return () => {
    eventTypes.forEach((type) => {
      const listener = listeners[type];
      if (listener) {
        eventSource.removeEventListener(type, listener);
      }
    });
    eventSource.close();
  };
}

export function resolveAgentServiceUrl(config?: { agentServiceUrl?: string | null } | null): string {
  return resolveBaseUrl(config?.agentServiceUrl || undefined);
}

