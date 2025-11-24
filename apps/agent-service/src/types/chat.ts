export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ViewContext {
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
}

export interface ConversationMetadata {
  userId?: string;
  locale?: string;
  [key: string]: unknown;
}

