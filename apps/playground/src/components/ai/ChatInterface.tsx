import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AlertCircle, Copy } from 'lucide-react';
import { useAIStore } from '@/stores/ai-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentContext } from '@/stores/context-store';
import {
  startAgentSession,
  subscribeToAgentStream,
  type AgentServiceEvent,
  type AgentServiceMessage,
} from '@/lib/ai/agent';
import {
  generateActionableQuestions,
  type ToolExecution,
} from '@/lib/ai/actionable-questions';
import { ActionableQuestions, type ActionableQuestion } from '@/components/ai/ActionableQuestions';
import {
  ConfirmationDialog,
  type InterruptPreview,
  type InterruptToolCall,
} from '@/components/ai/ConfirmationDialog';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { MemoryManager } from '@/lib/ai/memory';
import ReactMarkdown from 'react-markdown';
import ChainOfThought from './ChainOfThought';
import { agentLogger, type ToolCallLog, type ThinkingLog } from '@/lib/ai/agent-logger';

export interface ChatInterfaceHandle {
  copyChat: () => Promise<void>;
  resetChat: () => Promise<void>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: string;
    error?: string;
  }>;
  thinking?: string[];
  actionableQuestions?: ActionableQuestion[];
  supervisorEvaluation?: {
    is_satisfactory: boolean;
    completeness_score: number;
    missing_answers?: string[];
    suggested_improvements?: string[];
  };
  tracingUrl?: string;
}

const createConversationId = () =>
  `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const ChatInterface = forwardRef<ChatInterfaceHandle>((_, ref) => {
  const { config, maxContextTokens, showChainOfThought } = useAIStore();
  const { tenantId, unitId, token, user } = useAuthStore();
  const viewContext = useCurrentContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memoryManagerRef = useRef<MemoryManager | null>(null);
  const conversationIdRef = useRef<string>(createConversationId());
  const streamCleanupRef = useRef<(() => void) | null>(null);
  // State for interrupt confirmation
  const [interruptState, setInterruptState] = useState<{
    tool_call: InterruptToolCall;
    preview: InterruptPreview;
    resumeFunction: () => Promise<void>;
  } | null>(null);

  const createMemoryManager = useCallback(
    (conversationId: string) => {
      const manager = new MemoryManager(conversationId, maxContextTokens);
      if (config) {
        manager.setConfig(config);
      }
      return manager;
    },
    [config, maxContextTokens]
  );

  // Initialize memory manager
  useEffect(() => {
    if (!memoryManagerRef.current) {
      memoryManagerRef.current = createMemoryManager(conversationIdRef.current);
    } else {
      memoryManagerRef.current.setMaxContextTokens(maxContextTokens);
      if (config) {
        memoryManagerRef.current.setConfig(config);
      }
    }
  }, [config, createMemoryManager, maxContextTokens]);

  useEffect(() => {
    return () => {
      streamCleanupRef.current?.();
    };
  }, []);

  // Validate agent service configuration
  useEffect(() => {
    if (!config || !tenantId || !unitId) {
      setAgentReady(false);
      setError(null);
      return;
    }

    if (!config.agentId || config.agentId.trim() === '') {
      setAgentReady(false);
      setError('Configura Agent ID in Settings > AI Engine');
      return;
    }

    setAgentReady(true);
    setError(null);
  }, [config, tenantId, unitId]);

  const handleSend = async () => {
    // If there's an active interrupt, don't allow new messages
    if (interruptState) {
      toast({
        title: 'Please confirm or cancel the pending operation',
        description: 'There is a pending operation waiting for your confirmation',
        variant: 'default',
      });
      return;
    }

    if (!input.trim() || loading || !agentReady) {
      if (!agentReady) {
        toast({
          title: 'Agent not ready',
          description: 'Please configure your AI engine in Settings',
          variant: 'destructive',
          action: (
            <ToastAction
              altText="Copy error message"
              onClick={() => {
                navigator.clipboard
                  .writeText('Please configure your AI engine in Settings')
                  .then(() => {
                    toast({
                      title: 'Copied',
                      description: 'Error message copied to clipboard',
                    });
                  });
              }}
            >
              <Copy className="h-4 w-4" />
            </ToastAction>
          ),
        });
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const userInput = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    // Create assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
      thinking: [],
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Initialize variables before try block so they're available in catch
    const executionStartTime = Date.now();
    let assistantResponse = '';
    const thinkingLogs: ThinkingLog[] = [];
    const toolCallLogs: Map<string, { startTime: number; toolCall: ToolCallLog }> = new Map();
    const toolExecutions: ToolExecution[] = [];

    try {
      // Add user message to memory
      if (memoryManagerRef.current) {
        await memoryManagerRef.current.addMessage('user', userInput);
      }

      // Prepare chat history from memory (or fallback to current messages)
      const fallbackHistory = [...messages, userMessage].reduce<AgentServiceMessage[]>(
        (history, msg) => {
          const role: AgentServiceMessage['role'] =
            msg.role === 'assistant' ? 'assistant' : 'user';
          history.push({
            role,
            content: msg.content,
          });
          return history;
        },
        []
      );
      const savedHistory =
        memoryManagerRef.current
          ?.getChatHistory()
          ?.map((msg) => {
            const normalizedRole: AgentServiceMessage['role'] =
              msg.role === 'assistant'
                ? 'assistant'
                : msg.role === 'system'
                  ? 'system'
                  : 'user';
            return {
              role: normalizedRole,
              content: msg.content,
            };
          }) ?? null;
      const chatHistory = savedHistory ?? fallbackHistory;

      if (!tenantId || !unitId || !config?.agentId) {
        throw new Error('Configurazione agente incompleta. Verifica tenant, unit e agentId.');
      }

      const sessionInfo = await startAgentSession({
        agentId: config.agentId,
        tenantId,
        unitId,
        messages: chatHistory,
        viewContext,
        metadata: {
          userId: user?._id,
          locale: navigator.language,
        },
        baseUrl: config.agentServiceUrl,
        authToken: token,
      });

      const serialize = (value: unknown): string => {
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      };

      const appendToAssistantMessage = (mutator: (msg: Message) => void) => {
        setMessages((prev) => {
          const updated = [...prev];
          const msgIndex = updated.findIndex((m) => m.id === assistantMessageId);
          if (msgIndex === -1) return updated;
          const currentMsg = { ...updated[msgIndex] };
          mutator(currentMsg);
          updated[msgIndex] = currentMsg;
          return updated;
        });
      };

      const pushThinking = (content: string) => {
        appendToAssistantMessage((msg) => {
          msg.thinking = [...(msg.thinking || []), content];
        });
        thinkingLogs.push({
          content,
          timestamp: Date.now(),
        });
      };

      await new Promise<void>((resolve, reject) => {
        const cleanup = subscribeToAgentStream({
          streamUrl: sessionInfo.streamUrl,
          onEvent: (event: AgentServiceEvent) => {
            switch (event.type) {
              case 'message': {
                const data = event.data as { role?: 'assistant' | 'tool'; content?: unknown };
                const chunk =
                  typeof data?.content === 'string' ? data.content : serialize(data?.content);
                if (data?.role === 'assistant' && chunk) {
                  assistantResponse += chunk;
                  appendToAssistantMessage((msg) => {
                    msg.content += chunk;
                  });
                }
                break;
              }
              case 'plan_step': {
                const data = event.data as { detail?: string; status?: 'started' | 'completed' };
                if (data?.detail) {
                  const detail = (data.status === 'completed' ? '✅' : '🧭') + ' ' + data.detail;
                  pushThinking(detail);
                }
                break;
              }
              case 'subagent_call': {
                const data = event.data as { agent?: string };
                if (data?.agent) {
                  pushThinking(`🤝 Subagent: ${data.agent}`);
                }
                break;
              }
              case 'tool_call': {
                const data = event.data as {
                  toolName?: string;
                  input?: Record<string, unknown>;
                };
                if (data && data.toolName) {
                  const toolName = data.toolName;
                  const args = data.input || {};
                  const callId = `${toolName}-${Date.now()}`;
                  const execution: ToolExecution = { name: toolName, args };
                  toolExecutions.push(execution);
                  const tracker = {
                    id: callId,
                    toolName,
                    startTime: Date.now(),
                    log: {
                      toolName,
                      args,
                      timestamp: Date.now(),
                    } as ToolCallLog,
                    execution,
                  };
                  toolCallLogs.set(callId, { startTime: tracker.startTime, toolCall: tracker.log });
                  appendToAssistantMessage((msg) => {
                    const currentCalls = msg.toolCalls ? [...msg.toolCalls] : [];
                    currentCalls.push({
                        name: toolName,
                      args,
                    });
                    msg.toolCalls = currentCalls;
                  });
                }
                break;
              }
              case 'tool_result': {
                const data = event.data as { toolName?: string; output?: unknown };
                if (data && data.toolName) {
                  const toolName = data.toolName;
                  const resultText = serialize(data.output);
                  appendToAssistantMessage((msg) => {
                    const updatedCalls = msg.toolCalls ? [...msg.toolCalls] : [];
                    for (let i = updatedCalls.length - 1; i >= 0; i -= 1) {
                      if (updatedCalls[i].name === toolName && !updatedCalls[i].result) {
                        updatedCalls[i] = {
                          ...updatedCalls[i],
                          result: resultText,
                        };
                        break;
                      }
                    }
                    msg.toolCalls = updatedCalls;
                  });

                  const trackerEntry = Array.from(toolCallLogs.entries())
                    .reverse()
                    .find(([, entry]) => entry.toolCall.toolName === toolName);
                  if (trackerEntry) {
                    const [, entry] = trackerEntry;
                    entry.toolCall.result = resultText;
                    entry.toolCall.durationMs = Date.now() - entry.startTime;
                  }
                  const exec = toolExecutions
                    .slice()
                    .reverse()
                    .find((execution) => execution.name === toolName && !execution.result);
                  if (exec) {
                    exec.result = data.output;
                  }
                }
                break;
              }
              case 'tracing': {
                const data = event.data as { runUrl?: string };
                if (data?.runUrl) {
                  appendToAssistantMessage((msg) => {
                    msg.tracingUrl = data.runUrl;
                  });
                }
                break;
              }
              case 'error': {
                const data = event.data as { message?: string };
                const message = data?.message || 'Errore durante l’esecuzione dell’agente';
                appendToAssistantMessage((msg) => {
                  msg.content = message;
                });
                cleanup();
                reject(new Error(message));
                break;
              }
              case 'done': {
                const actionable = generateActionableQuestions(toolExecutions, userInput);
                if (actionable.length > 0) {
                  appendToAssistantMessage((msg) => {
                    msg.actionableQuestions = actionable;
                  });
                }
                cleanup();
                resolve();
                break;
              }
              default:
                break;
            }
          },
          onError: (error) => {
            cleanup();
            reject(error);
          },
        });
        streamCleanupRef.current = cleanup;
      });

      if (memoryManagerRef.current && assistantResponse.trim()) {
        await memoryManagerRef.current.addMessage('assistant', assistantResponse);
      }

      const executionDurationMs = Date.now() - executionStartTime;
      agentLogger.logExecution({
        conversationId: conversationIdRef.current,
        messageId: assistantMessageId,
        userMessage: userInput,
        assistantResponse,
        thinking: thinkingLogs,
        toolCalls: Array.from(toolCallLogs.values()).map((entry) => entry.toolCall),
        timestamp: executionStartTime,
        durationMs: executionDurationMs,
      });
    } catch (err) {
      console.error('Failed to run agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process message';

      // Log execution with error
      const executionDurationMs = Date.now() - executionStartTime;
      agentLogger.logExecution({
        conversationId: conversationIdRef.current,
        messageId: assistantMessageId,
        userMessage: userInput,
        assistantResponse: assistantResponse || '',
        thinking: thinkingLogs,
        toolCalls: Array.from(toolCallLogs.values()).map((entry) => entry.toolCall),
        timestamp: executionStartTime,
        durationMs: executionDurationMs,
        error: errorMessage,
      });

      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error message"
            onClick={() => {
              navigator.clipboard.writeText(errorMessage).then(() => {
                toast({
                  title: 'Copied',
                  description: 'Error message copied to clipboard',
                });
              });
            }}
          >
            <Copy className="h-4 w-4" />
          </ToastAction>
        ),
      });
    } finally {
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
      setLoading(false);
    }
  };

  const handleCopyChat = useCallback(async () => {
    if (!messages.length) {
      toast({
        title: 'Nothing to copy',
        description: 'Start chatting to enable transcript copy',
      });
      return;
    }

    const transcript = messages
      .map((message) => {
        const timestamp = message.timestamp.toLocaleString();
        const role = message.role.toUpperCase();
        const content = message.content.trim() || '[no content]';
        return `[${role}] ${timestamp}\n${content}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(transcript);
      toast({
        title: 'Chat copied',
        description: 'Full conversation copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy chat:', err);
      toast({
        title: 'Copy failed',
        description: 'Unable to copy chat. Please try again.',
        variant: 'destructive',
      });
    }
  }, [messages, toast]);

  const handleResetChat = useCallback(async () => {
    streamCleanupRef.current?.();
    streamCleanupRef.current = null;
    if (memoryManagerRef.current) {
      memoryManagerRef.current.clearMemory();
    }
    const newConversationId = createConversationId();
    conversationIdRef.current = newConversationId;
    memoryManagerRef.current = createMemoryManager(newConversationId);
    setMessages([]);
    setInput('');
    setError(null);
    toast({
      title: 'Session reset',
      description: 'Started a new chat session.',
    });
  }, [createMemoryManager, toast]);

  useImperativeHandle(ref, () => ({
    copyChat: handleCopyChat,
    resetChat: handleResetChat,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Status Banner */}
      {!config && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Please configure your AI engine in Settings to use the assistant</span>
          </div>
        </div>
      )}
      {config && !agentReady && !loading && (
        <div className="bg-red-50 border-b border-red-200 p-3 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error || 'Agent initialization failed. Please check your configuration.'}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p>Start a conversation with the AI assistant</p>
              <p className="text-sm mt-2">Ask questions about your CRM data</p>
              {config && agentReady && (
                <p className="text-xs mt-1 text-gray-400">
                  Using {config.provider} ({config.model})
                </p>
              )}
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'
              }
            >
              <div
                className={`
                max-w-[80%] rounded-lg px-4 py-2
                ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gray-100'}
              `}
              >
                <div className="text-sm">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children, ...props }) => {
                        // Handle internal links (starting with /entities/)
                        if (href && href.startsWith('/entities/')) {
                          return (
                            <a
                              {...props}
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(href);
                              }}
                              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                            >
                              {children}
                            </a>
                          );
                        }
                        // External links open in new tab
                        return (
                          <a
                            {...props}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {children}
                          </a>
                        );
                      },
                      p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({ ...props }) => (
                        <ul className="list-disc list-inside mb-2 space-y-1" {...props} />
                      ),
                      ol: ({ ...props }) => (
                        <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />
                      ),
                      li: ({ ...props }) => <li className="ml-4" {...props} />,
                      strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                      em: ({ ...props }) => <em className="italic" {...props} />,
                      code: ({
                        inline,
                        ...props
                      }: {
                        inline?: boolean;
                        className?: string;
                        children?: React.ReactNode;
                      }) =>
                        inline ? (
                          <code
                            className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs"
                            {...props}
                          />
                        ) : (
                          <code
                            className="block bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto"
                            {...props}
                          />
                        ),
                      pre: ({ ...props }) => (
                        <pre
                          className="bg-gray-200 dark:bg-gray-700 p-2 rounded mb-2 overflow-x-auto"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
              {/* Chain of Thought visualization for assistant messages */}
              {message.role === 'assistant' && showChainOfThought && (
                <div className="w-full max-w-[80%]">
                  <ChainOfThought
                    thinking={message.thinking}
                    toolCalls={message.toolCalls}
                    userMessage={(() => {
                      // Find the user message that precedes this assistant message
                      const messageIndex = messages.findIndex((m) => m.id === message.id);
                      if (messageIndex > 0) {
                        // Look backwards for the most recent user message
                        for (let i = messageIndex - 1; i >= 0; i--) {
                          if (messages[i].role === 'user') {
                            return messages[i].content;
                          }
                        }
                      }
                      return undefined;
                    })()}
                    assistantResponse={message.content}
                  />
                </div>
              )}
              {/* Actionable Questions for assistant messages */}
              {message.role === 'assistant' &&
                message.actionableQuestions &&
                message.actionableQuestions.length > 0 && (
                  <div className="w-full max-w-[80%] mt-2">
                    <ActionableQuestions
                      questions={message.actionableQuestions}
                      onQuestionClick={(action: string) => {
                        // Send the action as a new user message
                        setInput(action);
                        // Trigger send after a brief delay to ensure input is set
                        setTimeout(() => {
                          handleSend();
                        }, 100);
                      }}
                    />
                  </div>
                )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              agentReady
                ? 'Type your message...'
                : 'Configure AI engine in Settings to start chatting'
            }
            disabled={loading || !agentReady}
            rows={3}
            className="resize-y min-h-[3rem] max-h-48"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim() || !agentReady}
            className="self-end"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog for interrupt */}
      {interruptState && (
        <ConfirmationDialog
          open={!!interruptState}
          interrupt_tool_call={interruptState.tool_call}
          interrupt_preview={interruptState.preview}
          onConfirm={async () => {
            await interruptState.resumeFunction();
            setInterruptState(null);
            setLoading(false);
          }}
          onCancel={() => {
            setInterruptState(null);
            setLoading(false);
            toast({
              title: 'Operation cancelled',
              description: 'The operation has been cancelled',
            });
          }}
        />
      )}
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
