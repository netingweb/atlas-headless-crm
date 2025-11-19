import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, AlertCircle, Copy } from 'lucide-react';
import { useAIStore } from '@/stores/ai-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentContext } from '@/stores/context-store';
import { createAgent, runAgentStream, type Agent } from '@/lib/ai/agent';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MemoryManager } from '@/lib/ai/memory';
import ReactMarkdown from 'react-markdown';

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
}

export default function ChatInterface() {
  const { config, disabledTools, maxContextTokens } = useAIStore();
  const { tenantId, unitId } = useAuthStore();
  const viewContext = useCurrentContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const agentRef = useRef<Agent | null>(null);
  const [agentReady, setAgentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memoryManagerRef = useRef<MemoryManager | null>(null);

  // Initialize memory manager
  useEffect(() => {
    if (!memoryManagerRef.current) {
      memoryManagerRef.current = new MemoryManager('default', maxContextTokens);
      if (config) {
        memoryManagerRef.current.setConfig(config);
      }
    } else {
      memoryManagerRef.current.setMaxContextTokens(maxContextTokens);
      if (config) {
        memoryManagerRef.current.setConfig(config);
      }
    }
  }, [config, maxContextTokens]);

  // Initialize agent when config is available
  useEffect(() => {
    const initAgent = async () => {
      if (!config || !tenantId || !unitId) {
        setAgentReady(false);
        setError(null);
        return;
      }

      if (!config.apiKey || config.apiKey.trim() === '') {
        setError('Please configure your AI engine API key in Settings > AI Engine');
        setAgentReady(false);
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        // Verify API key is present and not empty
        const apiKey = config.apiKey?.trim();
        if (!apiKey || apiKey === '') {
          throw new Error('API key is required. Please configure it in Settings > AI Engine.');
        }

        console.log('[ChatInterface] Initializing agent with config:', {
          provider: config.provider,
          model: config.model,
          hasApiKey: !!apiKey,
          apiKeyLength: apiKey.length,
          apiKeyPrefix: apiKey.substring(0, 7) + '...',
          tenantId,
          unitId,
        });
        const agent = await createAgent(
          config,
          {
            tenant_id: tenantId,
            unit_id: unitId,
          },
          disabledTools,
          {
            entityType: viewContext.entityType,
            entityId: viewContext.entityId,
            route: viewContext.route,
          },
          memoryManagerRef.current || undefined
        );
        agentRef.current = agent;
        setAgentReady(true);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize agent:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize AI agent';
        setError(errorMessage);
        setAgentReady(false);
        setLoading(false);
        toast({
          title: 'Agent initialization failed',
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
      }
    };

    initAgent();
  }, [
    config,
    tenantId,
    unitId,
    disabledTools,
    viewContext.entityType,
    viewContext.entityId,
    viewContext.route,
    toast,
  ]);

  const handleSend = async () => {
    if (!input.trim() || loading || !agentReady || !agentRef.current) {
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

    try {
      // Add user message to memory
      if (memoryManagerRef.current) {
        await memoryManagerRef.current.addMessage('user', userInput);
      }

      // Prepare chat history from memory (or fallback to current messages)
      const chatHistory = memoryManagerRef.current
        ? memoryManagerRef.current.getChatHistory()
        : messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

      // Stream agent response
      let assistantResponse = '';
      for await (const event of runAgentStream(agentRef.current, userInput, chatHistory)) {
        setMessages((prev) => {
          const updated = [...prev];
          const msgIndex = updated.findIndex((m) => m.id === assistantMessageId);
          if (msgIndex === -1) return updated;

          const currentMsg = { ...updated[msgIndex] };

          switch (event.type) {
            case 'thinking':
              if (event.content) {
                currentMsg.thinking = [...(currentMsg.thinking || []), event.content];
              }
              break;
            case 'content':
              if (event.content) {
                currentMsg.content += event.content;
                assistantResponse += event.content;
              }
              break;
            case 'tool_call':
              if (event.toolName) {
                currentMsg.toolCalls = [
                  ...(currentMsg.toolCalls || []),
                  {
                    name: event.toolName,
                    args: event.toolArgs || {},
                  },
                ];
              }
              break;
            case 'tool_result':
              if (event.toolName) {
                const toolCalls = currentMsg.toolCalls || [];
                const toolIndex = toolCalls.findIndex((tc) => tc.name === event.toolName);
                if (toolIndex !== -1) {
                  toolCalls[toolIndex] = {
                    ...toolCalls[toolIndex],
                    result: event.toolResult,
                    error: event.error,
                  };
                  currentMsg.toolCalls = toolCalls;
                }
              }
              break;
            case 'error':
              currentMsg.content = event.content || 'An error occurred';
              break;
            case 'entity_updated':
              // Invalidate React Query cache for the updated entity
              if (event.entityType && event.entityId && tenantId && unitId) {
                // Invalidate specific entity query
                queryClient.invalidateQueries({
                  queryKey: ['entity', tenantId, unitId, event.entityType, event.entityId],
                });
                // Invalidate entity list query
                queryClient.invalidateQueries({
                  queryKey: ['entity', tenantId, unitId, event.entityType],
                });
                // Invalidate entity documents if applicable
                queryClient.invalidateQueries({
                  queryKey: [
                    'entity-documents',
                    tenantId,
                    unitId,
                    event.entityType,
                    event.entityId,
                  ],
                });

                // Show notification if entity is different from current view
                if (
                  viewContext.entityType !== event.entityType ||
                  viewContext.entityId !== event.entityId
                ) {
                  toast({
                    title: 'Entity updated',
                    description: `The ${event.entityType} has been updated by the AI agent`,
                    action: (
                      <ToastAction
                        altText="View entity"
                        onClick={() => {
                          navigate(`/entities/${event.entityType}/${event.entityId}`);
                        }}
                      >
                        View
                      </ToastAction>
                    ),
                  });
                } else {
                  // If viewing the same entity, show a simple notification
                  toast({
                    title: 'Entity updated',
                    description: 'The entity has been updated. Refreshing...',
                  });
                }
              }
              break;
          }

          updated[msgIndex] = currentMsg;
          return updated;
        });
      }

      // Add assistant response to memory after streaming completes
      if (memoryManagerRef.current && assistantResponse.trim()) {
        await memoryManagerRef.current.addMessage('assistant', assistantResponse);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to run agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process message';
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
      setLoading(false);
    }
  };

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
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

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={
              agentReady
                ? 'Type your message...'
                : 'Configure AI engine in Settings to start chatting'
            }
            disabled={loading || !agentReady}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim() || !agentReady}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
