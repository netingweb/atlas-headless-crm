import type { AIConfig } from '@/stores/ai-store';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface MessageMemory {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

export interface ConversationMemory {
  id: string;
  summary?: string;
  messages: MessageMemory[];
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ai-agent-memory';
const MAX_RECENT_MESSAGES = 10; // Keep last N messages after summarization
const SUMMARY_PROMPT = `Summarize the following conversation history, focusing on:
- Key decisions made
- Entity references (contacts, companies, opportunities, etc.)
- User preferences and patterns
- Important context that should be remembered

Conversation history:
{history}

Provide a concise summary that captures the essential information:`;

/**
 * Estimate token count (approximate: 4 characters = 1 token)
 * This is a simple estimation. For more accuracy, use tiktoken library.
 */
export function estimateTokenCount(text: string): number {
  // Simple estimation: ~4 characters per token
  // This is a rough approximation, actual tokenization varies by model
  return Math.ceil(text.length / 4);
}

/**
 * Memory Manager for AI Agent
 * Manages conversation history with summarization when token limit is exceeded
 */
export class MemoryManager {
  private config: AIConfig | null = null;
  private maxContextTokens: number = 8000;
  private conversationId: string;
  private storageKey: string;

  constructor(conversationId: string = 'default', maxContextTokens: number = 8000) {
    this.conversationId = conversationId;
    this.maxContextTokens = maxContextTokens;
    this.storageKey = `${STORAGE_KEY}-${conversationId}`;
  }

  /**
   * Set AI config for summarization
   */
  setConfig(config: AIConfig): void {
    this.config = config;
  }

  /**
   * Set max context tokens
   */
  setMaxContextTokens(maxTokens: number): void {
    this.maxContextTokens = maxTokens;
  }

  /**
   * Load conversation memory from storage
   */
  loadMemory(): ConversationMemory | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as ConversationMemory;
    } catch (error) {
      console.error('[MemoryManager] Failed to load memory:', error);
      return null;
    }
  }

  /**
   * Save conversation memory to storage
   */
  private saveMemory(memory: ConversationMemory): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(memory));
    } catch (error) {
      console.error('[MemoryManager] Failed to save memory:', error);
      // If storage is full, try to clear old conversations
      this.clearOldConversations();
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(memory));
      } catch (retryError) {
        console.error('[MemoryManager] Failed to save memory after cleanup:', retryError);
      }
    }
  }

  /**
   * Clear old conversations to free up storage
   */
  private clearOldConversations(): void {
    try {
      const keys = Object.keys(localStorage);
      const memoryKeys = keys.filter((key) => key.startsWith(STORAGE_KEY));

      // Sort by timestamp (newest first) and keep only the 5 most recent
      const memories = memoryKeys
        .map((key) => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}') as ConversationMemory;
            return { key, updatedAt: data.updatedAt || 0 };
          } catch {
            return { key, updatedAt: 0 };
          }
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(5);

      // Remove old conversations
      memoryKeys.forEach((key) => {
        if (!memories.find((m) => m.key === key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('[MemoryManager] Failed to clear old conversations:', error);
    }
  }

  /**
   * Add a message to memory
   */
  async addMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    const memory = this.loadMemory() || this.createNewMemory();
    const tokenCount = estimateTokenCount(content);

    const message: MessageMemory = {
      role,
      content,
      timestamp: Date.now(),
      tokenCount,
    };

    memory.messages.push(message);
    memory.totalTokens += tokenCount;
    memory.updatedAt = Date.now();

    // Check if we need to summarize
    if (memory.totalTokens > this.maxContextTokens) {
      await this.summarizeMemory(memory);
    } else {
      this.saveMemory(memory);
    }
  }

  /**
   * Create new conversation memory
   */
  private createNewMemory(): ConversationMemory {
    return {
      id: this.conversationId,
      messages: [],
      totalTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Summarize conversation history when token limit is exceeded
   */
  private async summarizeMemory(memory: ConversationMemory): Promise<void> {
    if (!this.config || !this.config.apiKey) {
      console.warn('[MemoryManager] Cannot summarize: no AI config available');
      // Still save the memory without summarization
      this.saveMemory(memory);
      return;
    }

    try {
      // Get messages to summarize (all except the last N recent messages)
      const messagesToSummarize = memory.messages.slice(0, -MAX_RECENT_MESSAGES);
      const recentMessages = memory.messages.slice(-MAX_RECENT_MESSAGES);

      if (messagesToSummarize.length === 0) {
        // Nothing to summarize, just save
        this.saveMemory(memory);
        return;
      }

      // Build conversation history text
      const historyText = messagesToSummarize
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      // Generate summary using LLM
      const llm = new ChatOpenAI({
        model: this.config.model,
        temperature: 0.3, // Lower temperature for more factual summaries
        apiKey: this.config.apiKey,
        openAIApiKey: this.config.apiKey,
      });

      const prompt = SUMMARY_PROMPT.replace('{history}', historyText);
      const response = await llm.invoke([
        new SystemMessage(
          'You are a helpful assistant that creates concise summaries of conversations.'
        ),
        new HumanMessage(prompt),
      ]);

      const summary =
        typeof response.content === 'string' ? response.content : String(response.content);
      const summaryTokens = estimateTokenCount(summary);

      // Calculate tokens for recent messages
      const recentTokens = recentMessages.reduce(
        (sum, msg) => sum + (msg.tokenCount || estimateTokenCount(msg.content)),
        0
      );

      // Create new memory with summary and recent messages
      const newMemory: ConversationMemory = {
        id: memory.id,
        summary: memory.summary
          ? `${memory.summary}\n\n${summary}` // Append to existing summary
          : summary,
        messages: recentMessages,
        totalTokens: summaryTokens + recentTokens,
        createdAt: memory.createdAt,
        updatedAt: Date.now(),
      };

      this.saveMemory(newMemory);
      console.log('[MemoryManager] Memory summarized:', {
        originalMessages: memory.messages.length,
        summarizedMessages: messagesToSummarize.length,
        keptRecentMessages: recentMessages.length,
        totalTokens: newMemory.totalTokens,
      });
    } catch (error) {
      console.error('[MemoryManager] Failed to summarize memory:', error);
      // Save memory without summarization if summarization fails
      this.saveMemory(memory);
    }
  }

  /**
   * Get conversation history for LLM context
   * Returns summary + recent messages formatted for system prompt
   */
  getContextHistory(): string {
    const memory = this.loadMemory();
    if (!memory || memory.messages.length === 0) {
      return '';
    }

    const parts: string[] = [];

    // Add summary if available
    if (memory.summary) {
      parts.push(`CONVERSATION SUMMARY:\n${memory.summary}\n`);
    }

    // Add recent messages
    if (memory.messages.length > 0) {
      parts.push('RECENT CONVERSATION:');
      memory.messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${role}: ${msg.content}`);
      });
    }

    return parts.join('\n\n');
  }

  /**
   * Get formatted messages array for chat history
   */
  getChatHistory(): Array<{ role: string; content: string }> {
    const memory = this.loadMemory();
    if (!memory) {
      return [];
    }

    return memory.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Clear conversation memory
   */
  clearMemory(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get memory statistics
   */
  getStats(): { totalMessages: number; totalTokens: number; hasSummary: boolean } {
    const memory = this.loadMemory();
    if (!memory) {
      return { totalMessages: 0, totalTokens: 0, hasSummary: false };
    }

    return {
      totalMessages: memory.messages.length,
      totalTokens: memory.totalTokens,
      hasSummary: !!memory.summary,
    };
  }
}
