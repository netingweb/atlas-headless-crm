/**
 * Agent Logger - Structured logging for AI agent tool usage and chain of thought
 *
 * This module provides observability for AI agent operations, tracking:
 * - Tool calls with arguments and results
 * - Thinking steps
 * - Errors and performance metrics
 * - Conversation context
 */

export interface ToolCallLog {
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  error?: string;
  timestamp: number;
  durationMs?: number;
}

export interface ThinkingLog {
  content: string;
  timestamp: number;
}

export interface SubagentCallLog {
  agent: string;
  input?: unknown;
  timestamp: number;
}

export interface SSECounters {
  messages: number;
  planSteps: number;
  subagentCalls: number;
  toolCalls: number;
  toolResults: number;
}

export interface AgentExecutionLog {
  conversationId: string;
  messageId: string;
  userMessage: string;
  assistantResponse: string;
  thinking: ThinkingLog[];
  toolCalls: ToolCallLog[];
  timestamp: number;
  durationMs: number;
  error?: string;
  tracingUrl?: string;
  sseEvents: SSECounters;
  subagentCalls: SubagentCallLog[];
}

class AgentLogger {
  private logs: AgentExecutionLog[] = [];
  private maxLogs = 100; // Keep last 100 executions in memory
  private enabled = true;

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set maximum number of logs to keep in memory
   */
  setMaxLogs(maxLogs: number): void {
    this.maxLogs = maxLogs;
    // Trim if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Log an agent execution
   */
  logExecution(log: AgentExecutionLog): void {
    if (!this.enabled) {
      return;
    }

    const normalized: AgentExecutionLog = {
      ...log,
      sseEvents: log.sseEvents ?? createEmptySSECounters(),
      subagentCalls: log.subagentCalls ?? [],
    };

    this.logs.push(normalized);

    // Trim if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console for debugging
    console.log('[AgentLogger] Execution logged:', {
      conversationId: log.conversationId,
      messageId: log.messageId,
      toolCallsCount: log.toolCalls.length,
      thinkingStepsCount: log.thinking.length,
      durationMs: log.durationMs,
      hasError: !!log.error,
    });
  }

  /**
   * Get all logs
   */
  getLogs(): AgentExecutionLog[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific conversation
   */
  getLogsByConversation(conversationId: string): AgentExecutionLog[] {
    return this.logs.filter((log) => log.conversationId === conversationId);
  }

  /**
   * Get logs for a specific message
   */
  getLogsByMessage(messageId: string): AgentExecutionLog[] {
    return this.logs.filter((log) => log.messageId === messageId);
  }

  /**
   * Get statistics about tool usage
   */
  getToolUsageStats(): Record<string, { count: number; errors: number; avgDurationMs: number }> {
    const stats: Record<string, { count: number; errors: number; totalDurationMs: number }> = {};

    this.logs.forEach((log) => {
      log.toolCalls.forEach((toolCall) => {
        if (!stats[toolCall.toolName]) {
          stats[toolCall.toolName] = {
            count: 0,
            errors: 0,
            totalDurationMs: 0,
          };
        }

        stats[toolCall.toolName].count++;
        if (toolCall.error) {
          stats[toolCall.toolName].errors++;
        }
        if (toolCall.durationMs) {
          stats[toolCall.toolName].totalDurationMs += toolCall.durationMs;
        }
      });
    });

    // Calculate averages
    const result: Record<string, { count: number; errors: number; avgDurationMs: number }> = {};
    Object.entries(stats).forEach(([toolName, stat]) => {
      result[toolName] = {
        count: stat.count,
        errors: stat.errors,
        avgDurationMs: stat.count > 0 ? stat.totalDurationMs / stat.count : 0,
      };
    });

    return result;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalExecutions: number;
    totalToolCalls: number;
    totalThinkingSteps: number;
    totalErrors: number;
    avgDurationMs: number;
    toolUsageStats: Record<string, { count: number; errors: number; avgDurationMs: number }>;
    sseEvents: SSECounters;
  } {
    const totalExecutions = this.logs.length;
    let totalToolCalls = 0;
    let totalThinkingSteps = 0;
    let totalErrors = 0;
    let totalDurationMs = 0;
    const sseEvents = createEmptySSECounters();

    this.logs.forEach((log) => {
      totalToolCalls += log.toolCalls.length;
      totalThinkingSteps += log.thinking.length;
      if (log.error) {
        totalErrors++;
      }
      totalDurationMs += log.durationMs;
      sseEvents.messages += log.sseEvents?.messages || 0;
      sseEvents.planSteps += log.sseEvents?.planSteps || 0;
      sseEvents.subagentCalls += log.sseEvents?.subagentCalls || 0;
      sseEvents.toolCalls += log.sseEvents?.toolCalls || 0;
      sseEvents.toolResults += log.sseEvents?.toolResults || 0;
    });

    return {
      totalExecutions,
      totalToolCalls,
      totalThinkingSteps,
      totalErrors,
      avgDurationMs: totalExecutions > 0 ? totalDurationMs / totalExecutions : 0,
      toolUsageStats: this.getToolUsageStats(),
      sseEvents,
    };
  }
}

// Singleton instance
export const agentLogger = new AgentLogger();

export function createEmptySSECounters(): SSECounters {
  return {
    messages: 0,
    planSteps: 0,
    subagentCalls: 0,
    toolCalls: 0,
    toolResults: 0,
  };
}

// Export for use in browser console debugging
if (typeof window !== 'undefined') {
  (window as unknown as { agentLogger: AgentLogger }).agentLogger = agentLogger;
}
