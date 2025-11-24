export type StreamEventType =
  | 'session_started'
  | 'message'
  | 'plan_step'
  | 'tool_call'
  | 'tool_result'
  | 'subagent_call'
  | 'tracing'
  | 'error'
  | 'done';

export interface SessionStartedEvent {
  sessionId: string;
  agentId: string;
  tenantId: string;
  unitId: string;
}

export interface MessageEvent {
  role: 'assistant' | 'tool';
  content: string;
  chunk?: boolean;
}

export interface PlanStepEvent {
  status: 'started' | 'completed';
  detail: string;
}

export interface ToolCallEvent {
  toolName: string;
  input: unknown;
}

export interface ToolResultEvent {
  toolName: string;
  output: unknown;
}

export interface SubAgentCallEvent {
  agent: string;
  input: unknown;
}

export interface TracingEvent {
  runUrl?: string;
}

export interface ErrorEvent {
  message: string;
}

export interface DoneEvent {
  finalMessage?: string;
  usage?: Record<string, unknown>;
}

export type AgentStreamEvent =
  | { type: 'session_started'; data: SessionStartedEvent }
  | { type: 'message'; data: MessageEvent }
  | { type: 'plan_step'; data: PlanStepEvent }
  | { type: 'tool_call'; data: ToolCallEvent }
  | { type: 'tool_result'; data: ToolResultEvent }
  | { type: 'subagent_call'; data: SubAgentCallEvent }
  | { type: 'tracing'; data: TracingEvent }
  | { type: 'error'; data: ErrorEvent }
  | { type: 'done'; data: DoneEvent };

