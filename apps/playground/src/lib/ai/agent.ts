import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { AIConfig } from '@/stores/ai-store';
import { mcpApi } from '@/lib/api/mcp';
import type { MemoryManager } from './memory';
// TenantContext type definition (matching @crm-atlas/core)
export interface TenantContext {
  tenant_id: string;
  unit_id: string;
}

/**
 * Create LLM instance based on AI configuration
 */
function createLLM(config: AIConfig): ChatOpenAI {
  const apiKey = config.apiKey?.trim();

  if (!apiKey || apiKey === '') {
    throw new Error('API key is required. Please configure it in Settings > AI Engine.');
  }

  console.log('[Agent] Creating LLM with config:', {
    provider: config.provider,
    model: config.model,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 7) + '...',
  });

  if (config.provider === 'azure') {
    // Azure OpenAI configuration
    return new ChatOpenAI({
      model: config.model,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2000,
      openAIApiKey: apiKey,
      // Note: Azure-specific fields may need to be configured via environment variables
      // or through the ChatOpenAI constructor options if supported by LangChain version
    } as any);
  }

  // Default to OpenAI
  // LangChain v1.0: Pass both apiKey and openAIApiKey for maximum compatibility
  console.log('[Agent] Creating ChatOpenAI with both apiKey and openAIApiKey parameters');

  const llmConfig = {
    model: config.model,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 2000,
    apiKey: apiKey,
    openAIApiKey: apiKey, // Explicit parameter name
  };

  console.log('[Agent] LLM Config:', {
    model: llmConfig.model,
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.maxTokens,
    hasApiKey: !!llmConfig.apiKey,
    hasOpenAIApiKey: !!llmConfig.openAIApiKey,
    apiKeyPrefix: llmConfig.apiKey?.substring(0, 7) + '...',
  });

  return new ChatOpenAI(llmConfig);
}

/**
 * Convert MCP tool schema to LangChain tool
 */
function createToolFromMCP(
  mcpTool: { name: string; description: string; inputSchema: Record<string, unknown> },
  ctx: TenantContext
): DynamicStructuredTool {
  // Convert JSON Schema to Zod schema
  const properties = (mcpTool.inputSchema.properties || {}) as Record<string, unknown>;
  const required = (mcpTool.inputSchema.required || []) as string[];

  const zodSchema: Record<string, z.ZodTypeAny> = {};
  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as {
      type?: string;
      description?: string;
      enum?: unknown[];
    };
    const isRequired = required.includes(key);

    let zodType: z.ZodTypeAny;
    switch (propSchema.type) {
      case 'string':
        zodType = z.string();
        // Handle enum if present
        if (propSchema.enum && Array.isArray(propSchema.enum)) {
          zodType = z.enum(propSchema.enum as [string, ...string[]]);
        }
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'integer':
        zodType = z.number().int();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'array':
        zodType = z.array(z.unknown());
        break;
      case 'object':
        zodType = z.record(z.unknown());
        break;
      default:
        zodType = z.unknown();
    }

    zodSchema[key] = isRequired ? zodType : zodType.optional();
  }

  console.log(`[Tool Schema] Generated Zod schema for ${mcpTool.name}:`, {
    properties: Object.keys(zodSchema),
    required,
    zodSchemaKeys: Object.keys(zodSchema),
  });

  const finalSchema = z.object(zodSchema);

  console.log(`[Tool Schema] Final schema for ${mcpTool.name}:`, {
    schemaKeys: Object.keys(zodSchema),
    requiredFields: required,
    inputSchema: mcpTool.inputSchema,
  });

  return new DynamicStructuredTool({
    name: mcpTool.name,
    description: mcpTool.description,
    schema: finalSchema,
    func: async (args: Record<string, unknown>) => {
      try {
        console.log(`[Tool] Calling MCP tool: ${mcpTool.name}`, {
          args,
          argsKeys: Object.keys(args),
          tenant: ctx.tenant_id,
          unit: ctx.unit_id,
        });

        // Validate args against schema before calling
        try {
          finalSchema.parse(args);
          console.log(`[Tool] Args validated successfully for ${mcpTool.name}`);
        } catch (validationError) {
          console.error(`[Tool] Schema validation failed for ${mcpTool.name}:`, {
            error: validationError,
            args,
            expectedSchema: zodSchema,
          });
          throw validationError;
        }

        const result = await mcpApi.callTool(ctx.tenant_id, ctx.unit_id, mcpTool.name, args);

        console.log(`[Tool] MCP tool ${mcpTool.name} result:`, result);

        // Handle MCP response format: { content: Array<{ type: string; text: string }>, isError: boolean }
        if (result && typeof result === 'object' && 'content' in result) {
          const mcpResult = result as {
            content: Array<{ type: string; text: string }>;
            isError?: boolean;
          };
          if (mcpResult.isError) {
            const errorText = mcpResult.content.map((c) => c.text).join('\n');

            // Provide helpful error message for OpenAI API key issues
            if (errorText.includes('OpenAI API key is required')) {
              throw new Error(
                'Backend requires OpenAI API key for semantic search. ' +
                  'Please configure OPENAI_API_KEY environment variable on the API server, ' +
                  'or configure embeddingsProvider.apiKey in the tenant configuration.'
              );
            }

            throw new Error(errorText);
          }
          // Parse and enhance JSON responses to highlight view links
          const textContent = mcpResult.content.map((c) => c.text).join('\n');

          // Try to parse JSON and enhance with link highlighting
          try {
            const parsed = JSON.parse(textContent);

            // Recursively find and highlight view_link fields
            const enhanceWithLinks = (obj: unknown, path = ''): unknown => {
              if (Array.isArray(obj)) {
                return obj.map((item, index) => enhanceWithLinks(item, `${path}[${index}]`));
              } else if (obj && typeof obj === 'object') {
                const enhanced: Record<string, unknown> = {};
                let hasViewLink = false;
                let viewLinkValue = '';

                for (const [key, value] of Object.entries(obj)) {
                  if (key === 'view_link' && typeof value === 'string') {
                    hasViewLink = true;
                    viewLinkValue = value;
                    // Keep the view_link
                    enhanced[key] = value;
                  } else {
                    enhanced[key] = enhanceWithLinks(value, path ? `${path}.${key}` : key);
                  }
                }

                // Add prominent link information at the top level
                if (hasViewLink) {
                  enhanced['🔗 VIEW_LINK'] = viewLinkValue;
                  enhanced['_IMPORTANT'] = `This entity can be viewed at: ${viewLinkValue}`;
                }

                return enhanced;
              }
              return obj;
            };

            const enhanced = enhanceWithLinks(parsed);

            // Extract all view links and add them prominently at the top
            const extractLinks = (
              obj: unknown,
              links: Array<{ path: string; link: string; name?: string }> = [],
              path = ''
            ): void => {
              if (Array.isArray(obj)) {
                obj.forEach((item, index) => extractLinks(item, links, `${path}[${index}]`));
              } else if (obj && typeof obj === 'object') {
                for (const [key, value] of Object.entries(obj)) {
                  if (key === 'view_link' && typeof value === 'string') {
                    const name =
                      (obj as { name?: string }).name ||
                      (obj as { _id?: string; id?: string })._id ||
                      (obj as { _id?: string; id?: string }).id ||
                      'Entity';
                    links.push({ path: path || 'root', link: value, name: String(name) });
                  } else if (key === 'links_summary' && Array.isArray(value)) {
                    // Already extracted links
                    (value as Array<{ view_link?: string; name?: string }>).forEach((item) => {
                      if (item.view_link) {
                        links.push({ path: 'summary', link: item.view_link, name: item.name });
                      }
                    });
                  } else {
                    extractLinks(value, links, path ? `${path}.${key}` : key);
                  }
                }
              }
            };

            const allLinks: Array<{ path: string; link: string; name?: string }> = [];
            extractLinks(enhanced, allLinks);

            // Add links summary at the top if links found
            if (allLinks.length > 0) {
              const linksNote = {
                _LINKS_FOUND: allLinks.map((l) => ({
                  entity: l.name || 'Entity',
                  view_link: l.link,
                  note: `🔗 Click to view: ${l.link}`,
                })),
                _INSTRUCTION:
                  'ALWAYS include these view links in your response using markdown format: [View EntityName](link)',
              };

              // Merge links note with enhanced object
              const finalResult: Record<string, unknown> = {
                ...linksNote,
                ...(enhanced as Record<string, unknown>),
              };

              return JSON.stringify(finalResult, null, 2);
            }

            return JSON.stringify(enhanced, null, 2);
          } catch {
            // If not JSON, return as-is
            return textContent;
          }
        }

        return JSON.stringify(result);
      } catch (error) {
        console.error(`[Tool] Error calling MCP tool ${mcpTool.name}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error calling tool ${mcpTool.name}: ${errorMsg}`);
      }
    },
  });
}

export interface Agent {
  llm: ReturnType<ChatOpenAI['bindTools']>;
  tools: DynamicStructuredTool[];
  systemPrompt: string;
}

/**
 * Create LangChain agent with MCP tools
 */
export async function createAgent(
  config: AIConfig,
  ctx: TenantContext,
  disabledToolNames?: Set<string>,
  viewContext?: { entityType: string | null; entityId: string | null; route: string | null },
  memoryManager?: MemoryManager
): Promise<Agent> {
  // Validate API key before proceeding
  const apiKey = config.apiKey?.trim();
  if (!apiKey || apiKey === '') {
    throw new Error('API key is required. Please configure it in Settings > AI Engine.');
  }

  console.log('[Agent] createAgent called with config:', {
    provider: config.provider,
    model: config.model,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 7) + '...',
    tenant: ctx.tenant_id,
    unit: ctx.unit_id,
  });

  // Load MCP tools
  const mcpTools = await mcpApi.listTools(ctx.tenant_id, ctx.unit_id);

  console.log(`[Agent] Loaded ${mcpTools.length} MCP tools from server`);

  // Filter tools: exclude disabled tools
  const filteredTools = disabledToolNames
    ? mcpTools.filter((tool) => !disabledToolNames.has(tool.name))
    : mcpTools; // If no filter provided, use all tools

  console.log(`[Agent] After filtering: ${filteredTools.length} tools available`);

  // Convert MCP tools to LangChain tools
  const tools = filteredTools.map((tool) => createToolFromMCP(tool, ctx));

  console.log(`[Agent] Created ${tools.length} LangChain tools`);

  // Create LLM with tools bound
  const llm = createLLM(config).bindTools(tools);

  // Create system prompt with detailed tool information
  const toolsDescription = tools
    .map((tool, index) => {
      // Get the tool's schema to show required fields
      const toolSchema = mcpTools.find((t) => t.name === tool.name);
      const requiredFields = (toolSchema?.inputSchema?.required || []) as string[];
      const properties = (toolSchema?.inputSchema?.properties || {}) as Record<string, unknown>;

      let toolInfo = `${index + 1}. ${tool.name}: ${tool.description}`;

      // Add usage examples for common search tools
      if (tool.name.startsWith('search_')) {
        toolInfo += `\n    Usage examples:\n    - To get count only: { "query": "*", "count_only": true }\n    - To search all: { "query": "*", "limit": 50 }\n    - To search specific: { "query": "search term", "limit": 10 }`;
      } else if (tool.name === 'global_search') {
        toolInfo += `\n    Usage examples:\n    - To search all entities: { "query": "search term", "limit": 10 }\n    - To get counts: { "query": "*", "count_only": true }`;
      }

      if (requiredFields.length > 0) {
        const requiredDetails = requiredFields
          .map((field: string) => {
            const prop = properties[field] as { type?: string; description?: string } | undefined;
            const type = prop?.type || 'unknown';
            const desc = prop?.description || '';
            return `    - ${field} (${type})${desc ? `: ${desc}` : ''} [REQUIRED]`;
          })
          .join('\n');
        toolInfo += `\n    Required fields:\n${requiredDetails}`;
      }
      return toolInfo;
    })
    .join('\n\n');

  // Build context-aware system prompt
  let contextInfo = '';
  if (viewContext?.entityType && viewContext?.entityId) {
    contextInfo = `\n\nCURRENT CONTEXT:
You are currently viewing a ${viewContext.entityType} entity with ID: ${viewContext.entityId}
Route: ${viewContext.route}

When the user refers to "this ${viewContext.entityType}", "current ${viewContext.entityType}", or similar, they are referring to the ${viewContext.entityType} with ID ${viewContext.entityId}.
You can use this context implicitly in your tool calls without asking the user for the entity ID.`;
  } else if (viewContext?.entityType) {
    contextInfo = `\n\nCURRENT CONTEXT:
You are currently viewing the ${viewContext.entityType} entity list.
Route: ${viewContext.route}`;
  }

  // Add memory context if available
  let memoryContext = '';
  if (memoryManager) {
    const historyContext = memoryManager.getContextHistory();
    if (historyContext) {
      memoryContext = `\n\nCONVERSATION HISTORY:\n${historyContext}\n`;
    }
  }

  // Get current date and time
  const now = new Date();
  const currentDate = now.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentTime = now.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  const currentDateTimeISO = now.toISOString();
  const currentTimestamp = now.getTime();

  // Calculate common temporal references
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // Calculate this week (Monday of current week)
  const thisWeekStart = new Date(now);
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to go back to Monday
  thisWeekStart.setDate(now.getDate() - daysToMonday);
  thisWeekStart.setHours(0, 0, 0, 0);

  // Calculate next week (Monday of next week)
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);

  const timeContext = `\n\nCURRENT DATE AND TIME:
Current Date: ${currentDate}
Current Time: ${currentTime}
ISO Format: ${currentDateTimeISO}
Unix Timestamp: ${currentTimestamp}

IMPORTANT - TEMPORAL REFERENCES:
When users mention time-related terms, use the current date/time above to interpret them:
- "oggi" / "today" = ${currentDate} (${now.toISOString().split('T')[0]})
- "domani" / "tomorrow" = ${tomorrow.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${tomorrow.toISOString().split('T')[0]})
- "ieri" / "yesterday" = ${yesterday.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${yesterday.toISOString().split('T')[0]})
- "tra un'ora" / "in an hour" = ${inOneHour.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} (${inOneHour.toISOString()})
- "fra 2 ore" / "in 2 hours" = ${inTwoHours.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} (${inTwoHours.toISOString()})
- "questa settimana" / "this week" = Week starting ${thisWeekStart.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${thisWeekStart.toISOString().split('T')[0]})
- "prossima settimana" / "next week" = Week starting ${nextWeekStart.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${nextWeekStart.toISOString().split('T')[0]})

When updating or creating entities with date/time fields, always convert relative time references (like "oggi", "domani", "tra un'ora") to the actual date/time values based on the current date/time above.
IMPORTANT: Always use ISO 8601 date-time format (YYYY-MM-DDTHH:mm:ss.sssZ) for ALL date and datetime fields.
Even if a field is defined as type "date" (without time), the backend expects date-time format with time set to midnight UTC (e.g., "2025-11-20T00:00:00.000Z").
For datetime fields, use the full ISO 8601 format with time (e.g., "2025-11-20T14:30:00.000Z").`;

  const totalToolsCount = tools.length;
  const toolsListHeader = `You have access to ${totalToolsCount} tools in total. When asked about available tools, you MUST list ALL ${totalToolsCount} tools, not just a summary. Here is the complete list:`;

  // Log tools count for debugging
  console.log(`[Agent] System prompt will include ${totalToolsCount} tools`);
  console.log(`[Agent] Tools list length: ${toolsDescription.length} characters`);

  const systemPrompt = `You are a helpful AI assistant for a CRM system. You can help users manage contacts, companies, tasks, notes, opportunities, products, and other entities.

CRITICAL - ANSWER ALL QUESTIONS:
When a user message contains MULTIPLE questions or requests, you MUST answer ALL of them. Do NOT skip any question or respond only to the first one. 
- If the user asks "quante aziende abbiamo? e quanti contatti?", you MUST answer BOTH questions
- If the user asks multiple questions separated by "?", "e", "and", or new lines, you MUST address EACH question
- Always provide a complete response that covers ALL questions in the user's message
- Use numbered lists or clear sections if needed to organize multiple answers
- NEVER leave any question unanswered - if you're unsure, use tools to find the answer

IMPORTANT: You have access to tools that can search and retrieve data from the CRM system. When users ask questions about data (counts, searches, lists), you MUST use these tools. Never say you don't have access - use the tools!

${toolsListHeader}
${toolsDescription}

CRITICAL INSTRUCTION FOR TOOL LISTING:
When a user asks "quali tools abbiamo disponibili?", "what tools are available?", "list all tools", "quali tools puoi usare?", or any similar question about available tools, you MUST:
1. Respond with a complete numbered list of ALL ${totalToolsCount} tools
2. Use the exact numbering from the list above (1, 2, 3, ... ${totalToolsCount})
3. Include the tool name and description for each tool
4. Do NOT provide a summary, grouped list, or category-based list
5. Do NOT skip any tools - you must list all ${totalToolsCount} tools

Example format when listing tools:
"Ho a disposizione ${totalToolsCount} tools:
1. tool_name_1: description
2. tool_name_2: description
...
${totalToolsCount}. tool_name_last: description"

CRITICAL - YOU MUST USE TOOLS:
When users ask questions about data in the CRM system (like "quanti prodotti abbiamo?", "how many contacts?", "cerca BMW", "find products", etc.), you MUST use the available tools to get the information. DO NOT guess or say you don't have access - USE THE TOOLS!

Examples of when to use tools:
- "quanti prodotti abbiamo?" → Use search_product with query: "*" and count_only: true
- "quanti contatti ci sono?" → Use search_contact with query: "*" and count_only: true  
- "cerca prodotti BMW" → Use search_product with query: "BMW" or global_search with query: "BMW"
- "mostrami tutti i prodotti" → Use search_product with query: "*" and limit: 50
- "trova contatti interessati" → Use search_contact with query: "interessati" or global_search

NEVER say "I don't have access" or "I can't retrieve" - ALWAYS try using the tools first!

IMPORTANT RULES:
- Always provide ALL required fields when creating entities
- If a required field is missing from user input, ask for it before proceeding
- Be thorough and ensure all mandatory information is collected
- When creating a company, you MUST include the 'email' field (it's required)
- When creating a contact, you MUST include both 'name' and 'email' fields (they're required)
- When asked about counts or lists, ALWAYS use search tools with appropriate parameters
${timeContext}${contextInfo}${memoryContext}

CRITICAL - VIEW LINKS: When tool results contain "view_link" or "🔗 VIEW_LINK" fields, you MUST ALWAYS include them in your response. 

FORMAT: Always add a clickable link using markdown format: [View Entity Name](view_link)

EXAMPLES:
- If search results show: { "_id": "123", "name": "John Doe", "view_link": "/entities/contact/123" }
  You MUST respond with: "Found contact John Doe. [View details](/entities/contact/123)"

- If multiple results: Always include a link for EACH entity found
  Example: "Found 2 contacts:
  - John Doe - [View](/entities/contact/123)
  - Jane Smith - [View](/entities/contact/456)"

- If results array contains items with view_link, add links for ALL items

NEVER skip the view_link - it's essential for user navigation. Always format as: [View EntityType](/entities/entityType/id)

REMEMBER: Always answer ALL questions in the user's message. If a user asks multiple questions, provide answers to ALL of them. Never skip or ignore any question - use tools if needed to find complete answers.

Always be helpful, accurate, and concise. When using tools, provide clear explanations of what you're doing.`;

  // Log final system prompt length for debugging
  console.log(`[Agent] System prompt total length: ${systemPrompt.length} characters`);
  console.log(
    `[Agent] System prompt estimated tokens: ~${Math.ceil(systemPrompt.length / 4)} tokens`
  );

  return {
    llm,
    tools,
    systemPrompt,
  };
}

/**
 * Run agent with user message
 */
export async function runAgent(
  agent: Agent,
  userMessage: string,
  chatHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  // Build messages array (can include ToolMessage)
  const messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage> = [
    new SystemMessage(agent.systemPrompt),
    ...chatHistory.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      }
      return new AIMessage(msg.content);
    }),
    new HumanMessage(userMessage),
  ];

  // Invoke LLM
  const response = await agent.llm.invoke(messages);

  // Check if LLM wants to call tools
  if (response.tool_calls && response.tool_calls.length > 0) {
    // Add the AI message with tool_calls to the conversation
    messages.push(response);

    // Execute tool calls and create ToolMessages
    const toolMessages = await Promise.all(
      response.tool_calls.map(async (toolCall) => {
        const tool = agent.tools.find((t) => t.name === toolCall.name);
        if (!tool) {
          return new ToolMessage({
            content: `Tool ${toolCall.name} not found`,
            tool_call_id: toolCall.id || '',
          });
        }

        try {
          const result = await tool.invoke(toolCall.args as Record<string, unknown>);
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          return new ToolMessage({
            content: resultStr,
            tool_call_id: toolCall.id || '',
          });
        } catch (error) {
          const errorMsg = `Error calling tool ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}`;
          return new ToolMessage({
            content: errorMsg,
            tool_call_id: toolCall.id || '',
          });
        }
      })
    );

    // Call LLM again with tool results
    const finalMessages = [...messages, ...toolMessages];

    const finalResponse = await agent.llm.invoke(finalMessages);
    return finalResponse.content as string;
  }

  return response.content as string;
}

export interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'content' | 'done' | 'error' | 'entity_updated';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
}

/**
 * Run agent with user message and stream events
 */
export async function* runAgentStream(
  agent: Agent,
  userMessage: string,
  chatHistory: Array<{ role: string; content: string }> = []
): AsyncGenerator<StreamEvent, void, unknown> {
  // Build messages array (can include ToolMessage)
  const messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage> = [
    new SystemMessage(agent.systemPrompt),
    ...chatHistory.map((msg) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      }
      return new AIMessage(msg.content);
    }),
    new HumanMessage(userMessage),
  ];

  try {
    // Stream LLM response
    const stream = await agent.llm.stream(messages);

    const toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];

    // Stream initial thinking/content and collect tool calls
    let streamedContent = '';
    for await (const chunk of stream) {
      if (chunk.content) {
        const content = Array.isArray(chunk.content)
          ? chunk.content
              .map((c: unknown) => (typeof c === 'string' ? c : JSON.stringify(c)))
              .join('')
          : typeof chunk.content === 'string'
            ? chunk.content
            : String(chunk.content);
        streamedContent += content;
        yield { type: 'content', content };
      }

      // Collect tool calls if present
      if (chunk.tool_calls && chunk.tool_calls.length > 0) {
        for (const toolCall of chunk.tool_calls) {
          if (!toolCalls.find((tc) => tc.id === toolCall.id)) {
            toolCalls.push({
              id: toolCall.id || '',
              name: toolCall.name || '',
              args: (toolCall.args || {}) as Record<string, unknown>,
            });

            yield {
              type: 'tool_call',
              toolName: toolCall.name,
              toolArgs: toolCall.args as Record<string, unknown>,
            };
          }
        }
      }
    }

    // If we have tool calls, execute them in a loop to support multiple rounds
    const maxIterations = 10; // Prevent infinite loops
    let iteration = 0;
    let pendingResponse: AIMessage | null = null;

    // If we have tool calls from the stream, construct the AIMessage properly
    if (toolCalls.length > 0) {
      // Ensure all tool calls have valid IDs
      const validToolCalls = toolCalls.map((tc) => ({
        id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: tc.name,
        args: tc.args,
      }));

      // Construct AIMessage with the tool calls from the stream
      // This ensures the tool_call_ids match what we'll use in ToolMessages
      pendingResponse = new AIMessage({
        content: streamedContent || '',
        tool_calls: validToolCalls,
      });
    } else {
      // No tool calls - if we have content, it's already been streamed
      // If we don't have content, the stream was empty (shouldn't happen)
      if (!streamedContent) {
        // Stream was empty - this might indicate an error or the LLM didn't respond
        // Try to get a response using invoke as fallback
        try {
          const fallbackResponse = await agent.llm.invoke(messages);
          if (fallbackResponse.content) {
            const content =
              typeof fallbackResponse.content === 'string'
                ? fallbackResponse.content
                : String(fallbackResponse.content);
            yield { type: 'content', content };
          }
        } catch (error) {
          console.error('[Agent] Error getting fallback response:', error);
          yield {
            type: 'error',
            content: 'The agent did not generate a response. Please try again.',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
      yield { type: 'done' };
      return;
    }

    while (pendingResponse && iteration < maxIterations) {
      iteration++;

      const response = pendingResponse;
      pendingResponse = null; // Clear pending response

      if (response.tool_calls && response.tool_calls.length > 0) {
        // Add the AI message with tool_calls to the conversation
        messages.push(response);

        // Execute each tool call and create ToolMessages
        for (const toolCall of response.tool_calls) {
          const tool = agent.tools.find((t) => t.name === toolCall.name);
          if (!tool) {
            const errorMsg = `Tool ${toolCall.name} not found`;
            yield {
              type: 'tool_result',
              toolName: toolCall.name,
              toolResult: errorMsg,
              error: 'Tool not found',
            };
            // Add ToolMessage with error
            messages.push(
              new ToolMessage({
                content: errorMsg,
                tool_call_id: toolCall.id || '',
              })
            );
            continue;
          }

          try {
            yield {
              type: 'thinking',
              content: `Calling tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.args)}...`,
            };

            console.log(`[Agent] Calling tool: ${toolCall.name} (iteration ${iteration})`, {
              args: toolCall.args,
              toolCallId: toolCall.id,
            });

            const result = await tool.invoke(toolCall.args as Record<string, unknown>);
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

            console.log(`[Agent] Tool ${toolCall.name} result:`, resultStr);

            // Check if this tool modifies an entity and emit entity_updated event
            const toolName = toolCall.name;
            if (
              toolName.startsWith('create_') ||
              toolName.startsWith('update_') ||
              toolName.startsWith('delete_')
            ) {
              // Extract entity type from tool name (e.g., "create_contact" -> "contact")
              const entityType = toolName.replace(/^(create_|update_|delete_)/, '');

              // Try to extract entity ID from result or args
              let entityId: string | undefined;
              try {
                const resultObj = typeof result === 'string' ? JSON.parse(resultStr) : result;
                // Check common ID fields
                entityId =
                  resultObj?._id || resultObj?.id || (toolCall.args?.id as string | undefined);
              } catch {
                // If parsing fails, try to get ID from args
                entityId = toolCall.args?.id as string | undefined;
              }

              if (entityType && entityId) {
                yield {
                  type: 'entity_updated',
                  entityType,
                  entityId,
                  changes: toolCall.args as Record<string, unknown>,
                };
              }
            }

            yield {
              type: 'tool_result',
              toolName: toolCall.name,
              toolArgs: toolCall.args as Record<string, unknown>,
              toolResult: resultStr,
            };

            // Add ToolMessage with the result (CRITICAL: must match tool_call_id)
            messages.push(
              new ToolMessage({
                content: resultStr,
                tool_call_id: toolCall.id || '',
              })
            );
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? error.stack : String(error);

            console.error(`[Agent] Tool ${toolCall.name} error:`, {
              error: errorMsg,
              details: errorDetails,
              args: toolCall.args,
            });

            yield {
              type: 'tool_result',
              toolName: toolCall.name,
              toolArgs: toolCall.args as Record<string, unknown>,
              toolResult: `Error: ${errorMsg}`,
              error: errorMsg,
            };
            // Add ToolMessage with error
            messages.push(
              new ToolMessage({
                content: `Error: ${errorMsg}. Details: ${errorDetails}`,
                tool_call_id: toolCall.id || '',
              })
            );
          }
        }

        // After executing all tool calls, check if LLM wants to call more tools
        yield { type: 'thinking', content: 'Processing tool results...' };

        // Check if there are more tool calls needed by invoking again
        const nextResponse = await agent.llm.invoke(messages);

        if (nextResponse.tool_calls && nextResponse.tool_calls.length > 0) {
          // There are more tool calls, process them in the next iteration
          pendingResponse = nextResponse;
          continue;
        } else {
          // No more tool calls, stream the final response
          messages.push(nextResponse);
          const finalStream = await agent.llm.stream(messages);

          for await (const chunk of finalStream) {
            if (chunk.content) {
              const content = Array.isArray(chunk.content)
                ? chunk.content
                    .map((c: unknown) => (typeof c === 'string' ? c : JSON.stringify(c)))
                    .join('')
                : typeof chunk.content === 'string'
                  ? chunk.content
                  : String(chunk.content);
              yield { type: 'content', content };
            }
          }

          yield { type: 'done' };
          return;
        }
      } else {
        // No tool calls in response, stream the final response
        messages.push(response);
        const finalStream = await agent.llm.stream(messages);

        for await (const chunk of finalStream) {
          if (chunk.content) {
            const content = Array.isArray(chunk.content)
              ? chunk.content
                  .map((c: unknown) => (typeof c === 'string' ? c : JSON.stringify(c)))
                  .join('')
              : typeof chunk.content === 'string'
                ? chunk.content
                : String(chunk.content);
            yield { type: 'content', content };
          }
        }

        yield { type: 'done' };
        return;
      }
    }

    // If we exit the loop without returning, check if we hit max iterations
    if (iteration >= maxIterations && pendingResponse) {
      yield {
        type: 'error',
        content: 'Maximum tool call iterations reached. The agent may be stuck in a loop.',
        error: 'Max iterations exceeded',
      };
    }

    yield { type: 'done' };
  } catch (error) {
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
