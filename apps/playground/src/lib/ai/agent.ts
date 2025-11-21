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

/**
 * Detect language from text (simple heuristic)
 */
function detectLanguage(text: string): 'it' | 'en' {
  // Simple heuristic: check for common Italian words/patterns
  const italianPatterns = [
    /\b(vuoi|vuole|vuoi|creare|crea|aggiungere|aggiungi|collegare|collega|vedere|vedi|mostrami|mostra|filtrare|filtra|raffinare|raffina|documenti|documento|contatto|contatti|azienda|aziende|opportunità|task|collegato|collegata)\b/i,
    /\b(questo|questa|questi|queste|quello|quella|quelli|quelle)\b/i,
    /\b(un|una|uno|del|della|dei|delle|al|alla|agli|alle)\b/i,
  ];

  const italianMatches = italianPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern)?.length || 0);
  }, 0);

  // If we find Italian patterns, assume Italian, otherwise default to English
  return italianMatches > 2 ? 'it' : 'en';
}

/**
 * Create supervisor tool for response evaluation and actionable questions generation
 */
function createSupervisorTool(config: AIConfig): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'supervisor_evaluate_response',
    description:
      "Evaluate if the agent's response is complete and satisfactory. Use this after generating a response to ensure all user questions are answered. Also generates actionable follow-up questions based on context.",
    schema: z.object({
      user_question: z.string().describe('Original user question/message'),
      agent_response: z.string().describe("Agent's generated response"),
      conversation_history: z
        .array(
          z.object({
            role: z.string(),
            content: z.string(),
          })
        )
        .optional()
        .describe('Recent conversation context'),
      tools_used: z.array(z.string()).optional().describe('List of tools that were called'),
      tool_results: z
        .array(
          z.object({
            tool_name: z.string(),
            tool_args: z.record(z.unknown()),
            tool_result: z.unknown().optional(),
          })
        )
        .optional()
        .describe('Details of tools executed with their results'),
    }),
    func: async (args) => {
      try {
        // Create a simple LLM instance for evaluation (reuse config)
        const evaluatorLLM = new ChatOpenAI({
          model: config.model,
          temperature: 0.3, // Lower temperature for more consistent evaluation
          maxTokens: 1000,
          apiKey: config.apiKey,
          openAIApiKey: config.apiKey,
        });

        // Detect language from user question
        const language = detectLanguage(args.user_question);
        const isItalian = language === 'it';

        const evaluationPrompt = `You are a supervisor evaluating an AI assistant's response quality.

User Question: ${args.user_question}

Agent Response: ${args.agent_response}

${args.tools_used ? `Tools Used: ${args.tools_used.join(', ')}` : ''}
${
  args.tool_results
    ? `Tool Results Summary: ${JSON.stringify(
        args.tool_results.map((tr: { tool_name: string; tool_result?: unknown }) => ({
          tool: tr.tool_name,
          has_result: !!tr.tool_result,
          result_preview:
            typeof tr.tool_result === 'string'
              ? tr.tool_result.substring(0, 200)
              : JSON.stringify(tr.tool_result).substring(0, 200),
        }))
      )}`
    : ''
}

IMPORTANT: The user's question is in ${isItalian ? 'Italian' : 'English'}. You MUST respond in the SAME language as the user's question.

CRITICAL CHECKS:
1. **Contradiction Detection**: Check if the agent says "not found" or "no results" but the tool results show data. This is a CRITICAL ERROR - mark is_satisfactory as false.
   IMPORTANT: Only consider it a contradiction if:
   - The user asked for a SPECIFIC search term (like "aleksandra", "Mario Rossi", etc.)
   - AND the tool results for that SPECIFIC search show data (count > 0 or results array has items)
   - AND the agent says "not found"
   DO NOT mark as contradiction if:
   - The specific search returned empty results (count: 0, results: [])
   - The agent correctly reports that the specific search found nothing
   - Other unrelated tool calls returned data (those are different searches)
2. **Data Presence**: If tool results contain data (like names, IDs, results array with items), but the agent says nothing was found, this is WRONG.
   BUT: Only check the tool results that match the user's specific query. If user asked for "aleksandra" and that search returned empty, it's correct to say "not found" even if other searches returned data.
3. **Incomplete Information**: If the agent mentions partial information (like a surname) but says "not found", this is contradictory.

Evaluate the response based on:
1. Completeness: Are all questions answered?
2. Accuracy: Is the information correct? (CRITICAL: Check for contradictions between tool results and agent response)
3. Clarity: Is the response understandable?
4. Usefulness: Is the response helpful?
5. **Contradiction Check**: Does the agent claim "not found" when tool results show data? This is a CRITICAL error.

Also, based on the tools used and results, suggest 2-4 actionable follow-up questions that would be helpful. 

${
  isItalian
    ? `
CRITICAL LANGUAGE REQUIREMENT FOR ACTIONABLE QUESTIONS:
- ALL "question" fields MUST be in Italian
- ALL "action" fields MUST be in Italian  
- Use Italian verbs, grammar, and phrasing
- Examples of Italian actionable questions:
  * "Vuoi creare un task collegato a questo contatto?"
  * "Vuoi filtrare o raffinare la ricerca di contatti?"
  * "Mostrami i documenti collegati a questo contatto"
- DO NOT use English for actionable questions - they MUST be in Italian
`
    : `
CRITICAL LANGUAGE REQUIREMENT FOR ACTIONABLE QUESTIONS:
- ALL "question" fields MUST be in English
- ALL "action" fields MUST be in English
- Use English verbs, grammar, and phrasing
- Examples of English actionable questions:
  * "Do you want to create a task linked to this contact?"
  * "Do you want to filter or refine the search for contacts?"
  * "Show me documents linked to this contact"
- DO NOT use Italian for actionable questions - they MUST be in English
`
}

Return a JSON object with this structure:
{
  "is_satisfactory": boolean (MUST be false if contradictions detected),
  "completeness_score": number (0-1),
  "missing_answers": string[] (if any questions weren't answered),
  "suggested_improvements": string[] (if response could be improved, MUST include contradiction fixes if detected),
  "contradiction_detected": boolean (true if agent says "not found" but tool results show data),
  "actionable_questions": [
    {
      "question": "Text to show on button ${isItalian ? '(MUST be in Italian - esempio: "Vuoi creare un task?")' : '(MUST be in English - example: "Do you want to create a task?")'}",
      "action": "Prompt to send when clicked ${isItalian ? '(MUST be in Italian - esempio: "Crea un task collegato al contatto 123")' : '(MUST be in English - example: "Create a task linked to contact 123")'}",
      "category": "follow_up_creation" | "search_refinement" | "related_action" | "clarification",
      "priority": number (1-4, lower is higher priority)
    }
  ]
}

Be concise and focus on actionable improvements. ${isItalian ? 'Rispondi sempre in italiano, inclusi tutti i campi delle actionable_questions.' : 'Always respond in English, including all actionable_questions fields.'}`;

        const response = await evaluatorLLM.invoke([new HumanMessage(evaluationPrompt)]);
        const content =
          typeof response.content === 'string' ? response.content : String(response.content);

        // Try to parse JSON response
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, content];
          const jsonStr = jsonMatch[1] || content;
          const parsed = JSON.parse(jsonStr);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // If parsing fails, return a default structure
          return JSON.stringify({
            is_satisfactory: true,
            completeness_score: 0.8,
            missing_answers: [],
            suggested_improvements: [],
            actionable_questions: [],
          });
        }
      } catch (error) {
        console.error('[Supervisor] Error evaluating response:', error);
        return JSON.stringify({
          is_satisfactory: true, // Default to satisfactory on error
          completeness_score: 0.8,
          missing_answers: [],
          suggested_improvements: [],
          actionable_questions: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}

/**
 * Check if a tool call should be interrupted for confirmation
 */
function shouldInterruptToolCall(toolName: string): boolean {
  return toolName.startsWith('update_') || toolName.startsWith('delete_');
}

/**
 * Generate preview of changes for interrupt confirmation
 */
async function generateInterruptPreview(
  toolCall: { name: string; args: Record<string, unknown> },
  ctx: TenantContext
): Promise<{
  entity_type: string;
  entity_id: string;
  current_state?: Record<string, unknown>;
  proposed_changes?: Record<string, unknown>;
  action_type: 'update' | 'delete';
}> {
  const entityType = toolCall.name.replace(/^(update_|delete_)/, '');
  const entityId = toolCall.args.id as string;

  const preview: {
    entity_type: string;
    entity_id: string;
    current_state?: Record<string, unknown>;
    proposed_changes?: Record<string, unknown>;
    action_type: 'update' | 'delete';
  } = {
    entity_type: entityType,
    entity_id: entityId,
    action_type: toolCall.name.startsWith('delete_') ? 'delete' : 'update',
  };

  if (toolCall.name.startsWith('update_')) {
    // Extract proposed changes (all args except id and confirmed)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, confirmed: _confirmed, ...proposedChanges } = toolCall.args;
    preview.proposed_changes = proposedChanges;

    // Try to get current state from API
    try {
      const { entitiesApi } = await import('@/lib/api/entities');
      const currentEntity = await entitiesApi.getById(
        ctx.tenant_id,
        ctx.unit_id,
        entityType,
        entityId,
        true
      );
      preview.current_state = currentEntity as Record<string, unknown>;
    } catch (error) {
      console.warn('[Supervisor] Could not fetch current state for preview:', error);
    }
  }

  return preview;
}

/**
 * Generate actionable questions based on executed tools
 */
function generateActionableQuestions(
  toolsExecuted: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>,
  userMessage?: string
): Array<{
  question: string;
  action: string;
  category:
    | 'confirmation'
    | 'follow_up_creation'
    | 'search_refinement'
    | 'related_action'
    | 'clarification';
  priority: number;
  icon?: string;
  tool_call_context?: {
    tool_name: string;
    tool_result?: unknown;
  };
}> {
  // Detect language from user message
  const language = userMessage ? detectLanguage(userMessage) : 'it'; // Default to Italian

  const actionableQuestions: Array<{
    question: string;
    action: string;
    category:
      | 'confirmation'
      | 'follow_up_creation'
      | 'search_refinement'
      | 'related_action'
      | 'clarification';
    priority: number;
    icon?: string;
    tool_call_context?: {
      tool_name: string;
      tool_result?: unknown;
    };
  }> = [];

  // Italian translations
  const translations = {
    it: {
      createTaskForContact: 'Vuoi creare un task collegato a questo contatto?',
      createTaskAction: (id: string) => `Crea un task collegato al contatto ${id}`,
      addContactForCompany: 'Vuoi aggiungere un contatto per questa azienda?',
      addContactAction: (id: string) => `Aggiungi un contatto per l'azienda ${id}`,
      linkOpportunity: 'Vuoi collegare questa opportunità a un contatto esistente?',
      linkOpportunityAction: (id: string) => `Collega l'opportunità ${id} a un contatto`,
      refineSearch: (entityType: string) =>
        `Vuoi filtrare o raffinare la ricerca di ${entityType}?`,
      refineSearchAction: (entityType: string) =>
        `Mostrami opzioni per filtrare la ricerca di ${entityType}`,
      viewDocuments: (entityType: string) =>
        `Vuoi vedere i documenti collegati a questo ${entityType}?`,
      viewDocumentsAction: (entityType: string, id: string) =>
        `Mostrami i documenti collegati al ${entityType} ${id}`,
    },
    en: {
      createTaskForContact: 'Do you want to create a task linked to this contact?',
      createTaskAction: (id: string) => `Create a task linked to contact ${id}`,
      addContactForCompany: 'Do you want to add a contact for this company?',
      addContactAction: (id: string) => `Add a contact for company ${id}`,
      linkOpportunity: 'Do you want to link this opportunity to an existing contact?',
      linkOpportunityAction: (id: string) => `Link opportunity ${id} to a contact`,
      refineSearch: (entityType: string) =>
        `Do you want to filter or refine the search for ${entityType}?`,
      refineSearchAction: (entityType: string) =>
        `Show me options to filter the search for ${entityType}`,
      viewDocuments: (entityType: string) =>
        `Do you want to see documents linked to this ${entityType}?`,
      viewDocumentsAction: (entityType: string, id: string) =>
        `Show me documents linked to ${entityType} ${id}`,
    },
  };

  const t = translations[language];

  for (const toolExec of toolsExecuted) {
    const toolName = toolExec.name;

    // Follow-up after creation
    if (toolName.startsWith('create_')) {
      const entityType = toolName.replace('create_', '');
      let entityId: string | undefined;

      // Try to extract entity ID from result
      try {
        const resultStr =
          typeof toolExec.result === 'string' ? toolExec.result : JSON.stringify(toolExec.result);
        const resultObj = JSON.parse(resultStr);
        entityId = resultObj?._id || resultObj?.id;
      } catch {
        // Ignore parsing errors
      }

      if (entityType === 'contact' && entityId) {
        actionableQuestions.push({
          question: t.createTaskForContact,
          action: t.createTaskAction(entityId),
          category: 'follow_up_creation',
          priority: 2,
          icon: 'Plus',
          tool_call_context: {
            tool_name: toolName,
            tool_result: toolExec.result,
          },
        });
      } else if (entityType === 'company' && entityId) {
        actionableQuestions.push({
          question: t.addContactForCompany,
          action: t.addContactAction(entityId),
          category: 'follow_up_creation',
          priority: 2,
          icon: 'Plus',
          tool_call_context: {
            tool_name: toolName,
            tool_result: toolExec.result,
          },
        });
      } else if (entityType === 'opportunity' && entityId) {
        actionableQuestions.push({
          question: t.linkOpportunity,
          action: t.linkOpportunityAction(entityId),
          category: 'follow_up_creation',
          priority: 2,
          icon: 'Link',
          tool_call_context: {
            tool_name: toolName,
            tool_result: toolExec.result,
          },
        });
      }
    }

    // Search refinement
    if (toolName.startsWith('search_')) {
      const entityType = toolName.replace('search_', '');
      let resultCount = 0;

      try {
        const resultStr =
          typeof toolExec.result === 'string' ? toolExec.result : JSON.stringify(toolExec.result);
        const resultObj = JSON.parse(resultStr);
        resultCount = resultObj?.count || resultObj?.results?.length || 0;
      } catch {
        // Ignore parsing errors
      }

      if (resultCount > 0) {
        actionableQuestions.push({
          question: t.refineSearch(entityType),
          action: t.refineSearchAction(entityType),
          category: 'search_refinement',
          priority: 3,
          icon: 'Filter',
          tool_call_context: {
            tool_name: toolName,
            tool_result: toolExec.result,
          },
        });
      }
    }

    // Related actions after get
    if (toolName.startsWith('get_')) {
      const entityType = toolName.replace('get_', '');
      const entityId = toolExec.args.id as string;

      if (entityId) {
        actionableQuestions.push({
          question: t.viewDocuments(entityType),
          action: t.viewDocumentsAction(entityType, entityId),
          category: 'related_action',
          priority: 3,
          icon: 'FileText',
          tool_call_context: {
            tool_name: toolName,
            tool_result: toolExec.result,
          },
        });
      }
    }
  }

  // Sort by priority and limit to 4
  return actionableQuestions.sort((a, b) => a.priority - b.priority).slice(0, 4);
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

  // Add supervisor tool
  const supervisorTool = createSupervisorTool(config);
  tools.push(supervisorTool);

  console.log(`[Agent] Created ${tools.length} LangChain tools (including supervisor)`);

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
        const entityType = tool.name.replace('search_', '');
        toolInfo += `\n    CRITICAL: When user asks for a specific ${entityType} by name, ALWAYS extract the name and pass it as "query" parameter!
    Usage examples:\n    - To search for specific ${entityType}: { "query": "name or search term", "limit": 10 }\n    - To get count only: { "query": "*", "count_only": true }\n    - To search all: { "query": "*", "limit": 50 }\n    - Example: User says "dammi i dati di aleksandra" → { "query": "aleksandra", "limit": 10 }\n    - Example: User says "trova Mario Rossi" → { "query": "Mario Rossi", "limit": 10 } or { "query": "Mario", "limit": 10 }`;
      } else if (tool.name === 'global_search') {
        toolInfo += `\n    CRITICAL: When user asks for a specific entity by name, ALWAYS extract the name and pass it as "query" parameter!
    Usage examples:\n    - To search for specific entity: { "query": "name or search term", "limit": 10 }\n    - To get counts: { "query": "*", "count_only": true }`;
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

CRITICAL - EXTRACTING SEARCH TERMS FROM USER REQUESTS:
When a user asks for information about a specific person, entity, or item, you MUST extract the search term and pass it to the search tool:
- "dammi i dati di aleksandra" → Use search_contact with query: "aleksandra" (NOT empty args!)
- "trova il contatto Mario Rossi" → Use search_contact with query: "Mario Rossi" or query: "Mario" or query: "Rossi"
- "cerca l'azienda Acme" → Use search_company with query: "Acme"
- "mostrami i dati di Giuseppe" → Use search_contact with query: "Giuseppe"
- "find contact John Doe" → Use search_contact with query: "John Doe" or query: "John" or query: "Doe"

NEVER call search tools with empty arguments {} when the user mentions a specific name, term, or identifier!
ALWAYS extract the search term from the user's request and pass it as the "query" parameter.

Examples of when to use tools:
- "quanti prodotti abbiamo?" → Use search_product with query: "*" and count_only: true
- "quanti contatti ci sono?" → Use search_contact with query: "*" and count_only: true  
- "cerca prodotti BMW" → Use search_product with query: "BMW" or global_search with query: "BMW"
- "mostrami tutti i prodotti" → Use search_product with query: "*" and limit: 50
- "trova contatti interessati" → Use search_contact with query: "interessati" or global_search
- "dammi i dati di aleksandra" → Use search_contact with query: "aleksandra" (CRITICAL: extract the name!)
- "trova il contatto con nome Marco" → Use search_contact with query: "Marco" (CRITICAL: extract the name!)

NEVER say "I don't have access" or "I can't retrieve" - ALWAYS try using the tools first!
NEVER call search tools with empty query when user mentions a specific name or term - ALWAYS extract and use that term!

CRITICAL - INTERPRETING SEARCH RESULTS:
When you receive tool results from search operations:
1. ALWAYS check the "results" array or "count" field in the tool response
2. If "count" > 0 or "results" array has items, you HAVE FOUND DATA - report it!
3. NEVER say "not found" or "no results" if the tool results show data
4. If tool results contain names, IDs, or any data fields, you MUST present that data to the user
5. If you mention partial information (like a surname) in your response, you HAVE found the data - don't contradict yourself by saying "not found"
6. Always read the FULL tool result JSON before responding - check for "results", "count", "hits", or data arrays
7. If search results show a "count" > 0 or a "results" array with items, you MUST say what you found, not that you found nothing

Example CORRECT behavior:
- Tool result: { "count": 1, "results": [{ "name": "Aleksandra Mikhailichenko", "_id": "123" }] }
- CORRECT response: "Ho trovato il contatto Aleksandra Mikhailichenko. [Visualizza dettagli](/entities/contact/123)"
- WRONG response: "Non ho trovato alcun contatto" (this contradicts the tool results!)

Example CORRECT behavior for partial matches:
- Tool result shows partial data (like surname in response) → You HAVE found data, present it fully
- NEVER say "not found" if you're mentioning any data from the search results

IMPORTANT RULES:
- Always provide ALL required fields when creating entities
- If a required field is missing from user input, ask for it before proceeding
- Be thorough and ensure all mandatory information is collected
- When creating a company, you MUST include the 'email' field (it's required)
- When creating a contact, you MUST include both 'name' and 'email' fields (they're required)
- When asked about counts or lists, ALWAYS use search tools with appropriate parameters
${timeContext}${contextInfo}${memoryContext}

CRITICAL - RELATION EXPLORATION:
When you use get_* tools (e.g., get_contact, get_company, get_order) to retrieve an entity, the system automatically explores and populates ALL related data:
1. **Direct References**: All reference fields (e.g., company_id) are automatically populated with full entity details (e.g., _company contains complete company information)
2. **Inverse Relations**: All entities that reference the retrieved entity are automatically included (e.g., when getting a company, all related orders, contacts, deals are included in _related_entities)
3. **Cross-Exploration**: Related entities also have their main references populated (up to 2 levels deep) for complete context
4. **Structure**: Related entities are organized in _related_entities object, grouped by entity type

This means when you retrieve an entity, you get a COMPLETE picture of all relationships:
- Example: get_contact returns the contact with _company populated AND _related_entities containing all orders, deals, etc. associated with that contact
- Example: get_company returns the company with _related_entities containing all contacts, orders, deals associated with that company

You do NOT need to make additional get_* calls for related entities - they are already included! Use the populated data to answer questions about relationships.

CRITICAL - VIEW LINKS: When tool results contain "view_link" or "🔗 VIEW_LINK" fields, you MUST ALWAYS include them in your response. 

FORMAT: Always add a clickable link using markdown format: [View Entity Name](view_link)

CRITICAL - USE RELATIVE LINKS ONLY:
- ALWAYS use the EXACT view_link value provided in the tool results
- NEVER add external domains like "https://app.crm.com" or any other domain
- NEVER convert relative links to absolute URLs
- The view_link is already a relative path (e.g., "/entities/contact/123") - use it AS-IS
- Example: If view_link is "/entities/contact/123", use exactly that, NOT "https://app.crm.com/entities/contact/123"

EXAMPLES:
- If search results show: { "_id": "123", "name": "John Doe", "view_link": "/entities/contact/123" }
  CORRECT: "Found contact John Doe. [View details](/entities/contact/123)"
  WRONG: "Found contact John Doe. [View details](https://app.crm.com/entities/contact/123)"

- If multiple results: Always include a link for EACH entity found
  Example: "Found 2 contacts:
  - John Doe - [View](/entities/contact/123)
  - Jane Smith - [View](/entities/contact/456)"

- If results array contains items with view_link, add links for ALL items

NEVER skip the view_link - it's essential for user navigation. 
NEVER add external domains - use the relative path exactly as provided in view_link.
Always format as: [View EntityType](/entities/entityType/id) - use the EXACT path from view_link field.

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
  type:
    | 'thinking'
    | 'tool_call'
    | 'tool_result'
    | 'content'
    | 'done'
    | 'error'
    | 'entity_updated'
    | 'supervisor_evaluation'
    | 'actionable_questions'
    | 'clarification_request'
    | 'interrupt_confirmation';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  evaluation?: {
    is_satisfactory: boolean;
    completeness_score: number;
    missing_answers?: string[];
    suggested_improvements?: string[];
  };
  questions?: Array<{
    question: string;
    action: string;
    category:
      | 'confirmation'
      | 'follow_up_creation'
      | 'search_refinement'
      | 'related_action'
      | 'clarification';
    priority?: number;
    icon?: string;
    tool_call_context?: {
      tool_name: string;
      tool_result?: unknown;
    };
  }>;
  // Interrupt confirmation fields
  interrupt_tool_call?: {
    name: string;
    args: Record<string, unknown>;
  };
  interrupt_preview?: {
    entity_type: string;
    entity_id: string;
    current_state?: Record<string, unknown>;
    proposed_changes?: Record<string, unknown>;
    action_type: 'update' | 'delete';
  };
}

/**
 * Run agent with user message and stream events
 */
export async function* runAgentStream(
  agent: Agent,
  userMessage: string,
  chatHistory: Array<{ role: string; content: string }> = [],
  ctx?: TenantContext
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

  // Track executed tools for actionable questions generation
  const executedTools: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }> = [];

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

          // Check if tool call requires confirmation (interrupt pattern)
          if (shouldInterruptToolCall(toolCall.name) && !toolCall.args.confirmed) {
            // Generate interrupt for confirmation
            if (ctx) {
              const preview = await generateInterruptPreview(toolCall, ctx);
              yield {
                type: 'interrupt_confirmation',
                interrupt_tool_call: {
                  name: toolCall.name,
                  args: toolCall.args,
                },
                interrupt_preview: preview,
              };
              // Pause execution - wait for user confirmation
              // The tool call will be executed later when user confirms
              return;
            }
          }

          // Warn if search tool is called with empty args when user message contains a name/term
          if (
            toolCall.name.startsWith('search_') &&
            Object.keys(toolCall.args || {}).length === 0
          ) {
            // Simple heuristic: check if user message contains what looks like a name or search term
            const hasSearchTerm =
              /\b(?:dammi|trova|cerca|mostrami|dati di|contatto|azienda|prodotto)\s+([a-zàèéìòù]+(?:\s+[a-zàèéìòù]+)?)/i.test(
                userMessage
              );
            if (hasSearchTerm) {
              console.warn(
                `[Agent] WARNING: Search tool ${toolCall.name} called with empty args, but user message appears to contain a search term: "${userMessage}"`
              );
            }
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

            // Track executed tool for actionable questions
            executedTools.push({
              name: toolCall.name,
              args: toolCall.args,
              result: result,
            });

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
        // NOTE: Actionable questions will be generated AFTER supervisor evaluation, not here
        yield { type: 'thinking', content: 'Processing tool results...' };

        // Check if there are more tool calls needed by invoking again
        const nextResponse = await agent.llm.invoke(messages);

        if (nextResponse.tool_calls && nextResponse.tool_calls.length > 0) {
          // There are more tool calls, process them in the next iteration
          pendingResponse = nextResponse;
          continue;
        } else {
          // No more tool calls, generate the final response
          let finalResponseContent = '';

          // Check if nextResponse already has content
          if (nextResponse.content) {
            // Use the content directly from nextResponse
            const content =
              typeof nextResponse.content === 'string'
                ? nextResponse.content
                : String(nextResponse.content);
            finalResponseContent = content;
            messages.push(nextResponse);
            yield { type: 'content', content };
          } else {
            // No content in nextResponse, need to generate it
            // Add nextResponse to messages first (it might have tool_calls metadata)
            messages.push(nextResponse);

            // Then stream the final response
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
                finalResponseContent += content;
                yield { type: 'content', content };
              }
            }
          }

          // If we still don't have content, try one more time with a direct invoke
          if (!finalResponseContent || finalResponseContent.trim() === '') {
            console.warn('[Agent] No content from streaming, trying direct invoke');
            const directResponse = await agent.llm.invoke(messages);
            if (directResponse.content) {
              const content =
                typeof directResponse.content === 'string'
                  ? directResponse.content
                  : String(directResponse.content);
              finalResponseContent = content;
              yield { type: 'content', content };
            }
          }

          // Evaluate response with supervisor
          try {
            const supervisorTool = agent.tools.find(
              (t) => t.name === 'supervisor_evaluate_response'
            );
            if (supervisorTool && finalResponseContent) {
              const evaluationResult = await supervisorTool.invoke({
                user_question: userMessage,
                agent_response: finalResponseContent,
                conversation_history: chatHistory,
                tools_used: executedTools.map((t) => t.name),
                tool_results: executedTools.map((t) => ({
                  tool_name: t.name,
                  tool_args: t.args,
                  tool_result: t.result,
                })),
              });

              try {
                const evaluation = JSON.parse(
                  typeof evaluationResult === 'string'
                    ? evaluationResult
                    : JSON.stringify(evaluationResult)
                );

                yield {
                  type: 'supervisor_evaluation',
                  evaluation: {
                    is_satisfactory: evaluation.is_satisfactory ?? true,
                    completeness_score: evaluation.completeness_score ?? 0.8,
                    missing_answers: evaluation.missing_answers ?? [],
                    suggested_improvements: evaluation.suggested_improvements ?? [],
                  },
                };

                // If contradiction detected, trigger refinement
                // But first verify it's a real contradiction by checking if the specific search found results
                if (evaluation.contradiction_detected) {
                  // Check if there's a tool result that matches the user's query and has data
                  const userQueryLower = userMessage.toLowerCase();
                  let hasMatchingResults = false;

                  // Try to extract search term from user message (simple heuristic)
                  const searchTerms = userQueryLower.match(
                    /\b(?:dammi|trova|cerca|mostrami|dati di|contatto|azienda)\s+([a-zàèéìòù]+(?:\s+[a-zàèéìòù]+)?)/i
                  );
                  const extractedTerm = searchTerms ? searchTerms[1] : null;

                  // Check tool results for matching searches
                  for (const toolResult of executedTools) {
                    if (toolResult.name.startsWith('search_')) {
                      const toolQuery = (toolResult.args?.query as string)?.toLowerCase() || '';
                      // Check if this tool call matches the user's search intent
                      if (extractedTerm && toolQuery.includes(extractedTerm.toLowerCase())) {
                        // Parse result to check if it has data
                        try {
                          const resultStr =
                            typeof toolResult.result === 'string'
                              ? toolResult.result
                              : JSON.stringify(toolResult.result);
                          const resultObj = JSON.parse(resultStr);
                          const count = resultObj?.count || resultObj?.results?.length || 0;
                          if (
                            count > 0 ||
                            (Array.isArray(resultObj?.results) && resultObj.results.length > 0)
                          ) {
                            hasMatchingResults = true;
                            break;
                          }
                        } catch {
                          // Ignore parsing errors
                        }
                      }
                    }
                  }

                  // Only trigger correction if we actually found matching results
                  if (hasMatchingResults) {
                    console.warn(
                      '[Supervisor] Contradiction detected - agent said "not found" but tool results show data'
                    );
                    const isItalian = detectLanguage(userMessage) === 'it';

                    // Generate a correction prompt and continue the loop
                    const correctionPrompt = isItalian
                      ? `ERRORE CRITICO: Hai detto che non hai trovato risultati, ma i risultati dei tool per la ricerca specifica mostrano dati. 
                      Per favore, rileggi attentamente i risultati dei tool che corrispondono alla ricerca richiesta dall'utente e fornisci una risposta corretta con i dati trovati.
                      Non dire mai "non trovato" se i risultati dei tool per la ricerca specifica contengono dati.
                      Presenta SOLO i dati trovati che corrispondono alla ricerca richiesta.`
                      : `CRITICAL ERROR: You said you found nothing, but the tool results for the specific search show data.
                      Please carefully re-read the tool results that match the user's search request and provide a correct response with the found data.
                      Never say "not found" if the tool results for the specific search contain data.
                      Present ONLY the data found that matches the requested search.`;

                    messages.push(new HumanMessage(correctionPrompt));
                    const correctedResponse = await agent.llm.invoke(messages);
                    messages.push(correctedResponse);

                    // Stream the corrected response
                    if (correctedResponse.content) {
                      const correctedContent =
                        typeof correctedResponse.content === 'string'
                          ? correctedResponse.content
                          : String(correctedResponse.content);
                      yield {
                        type: 'content',
                        content: `\n\n⚠️ ${isItalian ? 'Correzione:' : 'Correction:'}\n\n${correctedContent}`,
                      };

                      // Update finalResponseContent with corrected content for supervisor re-evaluation
                      finalResponseContent = correctedContent;

                      // Re-evaluate the corrected response with supervisor
                      try {
                        const reEvaluationResult = await supervisorTool.invoke({
                          user_question: userMessage,
                          agent_response: finalResponseContent,
                          conversation_history: chatHistory,
                          tools_used: executedTools.map((t) => t.name),
                          tool_results: executedTools.map((t) => ({
                            tool_name: t.name,
                            tool_args: t.args,
                            tool_result: t.result,
                          })),
                        });

                        try {
                          const reEvaluation = JSON.parse(
                            typeof reEvaluationResult === 'string'
                              ? reEvaluationResult
                              : JSON.stringify(reEvaluationResult)
                          );

                          // Update evaluation with corrected response evaluation
                          Object.assign(evaluation, reEvaluation);
                        } catch {
                          // Ignore re-evaluation parsing errors
                        }
                      } catch {
                        // Ignore re-evaluation errors
                      }
                    }
                  } else {
                    console.log(
                      '[Supervisor] Contradiction flagged but no matching results found - likely false positive, ignoring'
                    );
                  }
                }

                // STEP 5: Emit actionable questions ONLY after supervisor evaluation and any corrections
                // This ensures actionable questions are based on the final, verified response
                if (evaluation.actionable_questions && evaluation.actionable_questions.length > 0) {
                  // Verify language consistency - if supervisor generated questions in wrong language, use fallback
                  const isItalian = detectLanguage(userMessage) === 'it';
                  const firstQuestion = evaluation.actionable_questions[0]?.question || '';
                  const isQuestionInCorrectLanguage = isItalian
                    ? detectLanguage(firstQuestion) === 'it'
                    : detectLanguage(firstQuestion) === 'en';

                  if (isQuestionInCorrectLanguage) {
                    yield {
                      type: 'actionable_questions',
                      questions: evaluation.actionable_questions,
                    };
                  } else {
                    // Supervisor generated questions in wrong language, use fallback instead
                    console.warn(
                      '[Supervisor] Actionable questions in wrong language, using fallback generator'
                    );
                    if (
                      evaluation.is_satisfactory !== false &&
                      !evaluation.contradiction_detected
                    ) {
                      const actionableQuestions = generateActionableQuestions(
                        executedTools,
                        userMessage
                      );
                      if (actionableQuestions.length > 0) {
                        yield {
                          type: 'actionable_questions',
                          questions: actionableQuestions,
                        };
                      }
                    }
                  }
                } else {
                  // Fallback: generate actionable questions from executed tools if supervisor didn't provide any
                  // But only if response is satisfactory (no contradictions)
                  if (evaluation.is_satisfactory !== false && !evaluation.contradiction_detected) {
                    const actionableQuestions = generateActionableQuestions(
                      executedTools,
                      userMessage
                    );
                    if (actionableQuestions.length > 0) {
                      yield {
                        type: 'actionable_questions',
                        questions: actionableQuestions,
                      };
                    }
                  }
                }

                // If response is not satisfactory and needs clarification (but no contradiction)
                if (
                  !evaluation.is_satisfactory &&
                  evaluation.needs_clarification &&
                  !evaluation.contradiction_detected
                ) {
                  const isItalian = detectLanguage(userMessage) === 'it';
                  yield {
                    type: 'clarification_request',
                    content:
                      evaluation.clarification_question ||
                      (isItalian
                        ? 'Potresti fornire più dettagli?'
                        : 'Could you provide more details?'),
                  };
                }
              } catch (parseError) {
                console.warn('[Supervisor] Failed to parse evaluation result:', parseError);
              }
            }
          } catch (evalError) {
            console.warn('[Supervisor] Error evaluating response:', evalError);
            // Continue even if evaluation fails
          }

          yield { type: 'done' };
          return;
        }
      } else {
        // No tool calls in response, stream the final response
        messages.push(response);
        const finalStream = await agent.llm.stream(messages);

        let finalResponseContent = '';
        for await (const chunk of finalStream) {
          if (chunk.content) {
            const content = Array.isArray(chunk.content)
              ? chunk.content
                  .map((c: unknown) => (typeof c === 'string' ? c : JSON.stringify(c)))
                  .join('')
              : typeof chunk.content === 'string'
                ? chunk.content
                : String(chunk.content);
            finalResponseContent += content;
            yield { type: 'content', content };
          }
        }

        // Evaluate response with supervisor even if no tools were used
        try {
          const supervisorTool = agent.tools.find((t) => t.name === 'supervisor_evaluate_response');
          if (supervisorTool && finalResponseContent) {
            const evaluationResult = await supervisorTool.invoke({
              user_question: userMessage,
              agent_response: finalResponseContent,
              conversation_history: chatHistory,
              tools_used: executedTools.map((t) => t.name),
              tool_results: executedTools.map((t) => ({
                tool_name: t.name,
                tool_args: t.args,
                tool_result: t.result,
              })),
            });

            try {
              const evaluation = JSON.parse(
                typeof evaluationResult === 'string'
                  ? evaluationResult
                  : JSON.stringify(evaluationResult)
              );

              yield {
                type: 'supervisor_evaluation',
                evaluation: {
                  is_satisfactory: evaluation.is_satisfactory ?? true,
                  completeness_score: evaluation.completeness_score ?? 0.8,
                  missing_answers: evaluation.missing_answers ?? [],
                  suggested_improvements: evaluation.suggested_improvements ?? [],
                },
              };

              // STEP 5: Emit actionable questions ONLY after supervisor evaluation
              // This ensures actionable questions are based on the final, verified response
              if (evaluation.actionable_questions && evaluation.actionable_questions.length > 0) {
                // Verify language consistency - if supervisor generated questions in wrong language, use fallback
                const isItalian = detectLanguage(userMessage) === 'it';
                const firstQuestion = evaluation.actionable_questions[0]?.question || '';
                const isQuestionInCorrectLanguage = isItalian
                  ? detectLanguage(firstQuestion) === 'it'
                  : detectLanguage(firstQuestion) === 'en';

                if (isQuestionInCorrectLanguage) {
                  yield {
                    type: 'actionable_questions',
                    questions: evaluation.actionable_questions,
                  };
                } else {
                  // Supervisor generated questions in wrong language, use fallback instead
                  console.warn(
                    '[Supervisor] Actionable questions in wrong language, using fallback generator'
                  );
                  if (
                    evaluation.is_satisfactory !== false &&
                    !evaluation.contradiction_detected &&
                    executedTools.length > 0
                  ) {
                    const actionableQuestions = generateActionableQuestions(
                      executedTools,
                      userMessage
                    );
                    if (actionableQuestions.length > 0) {
                      yield {
                        type: 'actionable_questions',
                        questions: actionableQuestions,
                      };
                    }
                  }
                }
              } else {
                // Fallback: generate actionable questions from executed tools if supervisor didn't provide any
                // But only if response is satisfactory (no contradictions)
                if (
                  evaluation.is_satisfactory !== false &&
                  !evaluation.contradiction_detected &&
                  executedTools.length > 0
                ) {
                  const actionableQuestions = generateActionableQuestions(
                    executedTools,
                    userMessage
                  );
                  if (actionableQuestions.length > 0) {
                    yield {
                      type: 'actionable_questions',
                      questions: actionableQuestions,
                    };
                  }
                }
              }

              // If response is not satisfactory and needs clarification
              if (!evaluation.is_satisfactory && evaluation.needs_clarification) {
                const isItalian = detectLanguage(userMessage) === 'it';
                yield {
                  type: 'clarification_request',
                  content:
                    evaluation.clarification_question ||
                    (isItalian
                      ? 'Potresti fornire più dettagli?'
                      : 'Could you provide more details?'),
                };
              }
            } catch (parseError) {
              console.warn('[Supervisor] Failed to parse evaluation result:', parseError);
            }
          }
        } catch (evalError) {
          console.warn('[Supervisor] Error evaluating response:', evalError);
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
