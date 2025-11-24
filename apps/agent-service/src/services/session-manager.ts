import { randomUUID } from 'node:crypto';
import { AgentSession, SessionRequestPayload, SessionStatus } from '../types/session.js';

export class SessionManager {
  private readonly sessions = new Map<string, AgentSession>();

  createSession(payload: SessionRequestPayload): AgentSession {
    const id = randomUUID();
    const now = Date.now();
    const session: AgentSession = {
      id,
      agentId: payload.agentId,
      tenantId: payload.tenantId,
      unitId: payload.unitId,
      messages: payload.messages,
      viewContext: payload.viewContext,
      metadata: payload.metadata,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(sessionId: string): AgentSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return session;
  }

  updateStatus(sessionId: string, status: SessionStatus, lastError?: string): AgentSession {
    const session = this.getSession(sessionId);
    const updated: AgentSession = {
      ...session,
      status,
      updatedAt: Date.now(),
      lastError,
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  upsertMessages(sessionId: string, messages: AgentSession['messages']): AgentSession {
    const session = this.getSession(sessionId);
    const updated: AgentSession = {
      ...session,
      messages,
      updatedAt: Date.now(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }
}

