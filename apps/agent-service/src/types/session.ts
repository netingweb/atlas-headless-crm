import { ChatMessage, ConversationMetadata, ViewContext } from './chat.js';

export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentSession {
  id: string;
  agentId: string;
  tenantId: string;
  unitId: string;
  messages: ChatMessage[];
  viewContext?: ViewContext | null;
  metadata?: ConversationMetadata;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
}

export interface SessionRequestPayload {
  tenantId: string;
  unitId: string;
  agentId: string;
  messages: ChatMessage[];
  viewContext?: ViewContext;
  metadata?: ConversationMetadata;
}

