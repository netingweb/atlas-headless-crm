import type { ActionableQuestion } from '@/components/ai/ActionableQuestions';

export interface ToolExecution {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export function detectLanguage(text: string): 'it' | 'en' {
  const italianPatterns = [
    /\b(vuoi|vuole|crea|creare|aggiungere|aggiungi|collegare|collega|vedere|vedi|mostrami|mostra|filtrare|filtra|raffinare|raffina|documenti|documento|contatto|contatti|azienda|aziende|opportunità|task|collegato|collegata)\b/i,
    /\b(questo|questa|questi|queste|quello|quella|quelli|quelle)\b/i,
    /\b(un|una|uno|del|della|dei|delle|al|alla|agli|alle)\b/i,
  ];

  const italianMatches = italianPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern)?.length || 0);
  }, 0);

  return italianMatches > 2 ? 'it' : 'en';
}

export function generateActionableQuestions(
  toolsExecuted: ToolExecution[],
  userMessage?: string
): ActionableQuestion[] {
  if (!toolsExecuted.length) {
    return [];
  }

  const language = userMessage ? detectLanguage(userMessage) : 'it';

  const translations = {
    it: {
      createTaskForContact: 'Vuoi creare un task collegato a questo contatto?',
      createTaskAction: (id: string) => `Crea un task collegato al contatto ${id}`,
      addContactForCompany: "Vuoi aggiungere un contatto per questa azienda?",
      addContactAction: (id: string) => `Aggiungi un contatto per l'azienda ${id}`,
      linkOpportunity: "Vuoi collegare questa opportunità a un contatto esistente?",
      linkOpportunityAction: (id: string) => `Collega l'opportunità ${id} a un contatto`,
      refineSearch: (entityType: string) => `Vuoi filtrare o raffinare la ricerca di ${entityType}?`,
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
  const actionable: ActionableQuestion[] = [];

  for (const execution of toolsExecuted) {
    const toolName = execution.name;

    if (toolName.startsWith('create_')) {
      const entityType = toolName.replace('create_', '');
      let entityId: string | undefined;
      try {
        const resultStr =
          typeof execution.result === 'string'
            ? execution.result
            : JSON.stringify(execution.result ?? {});
        const parsed = JSON.parse(resultStr);
        entityId = parsed?._id || parsed?.id;
      } catch {
        entityId = undefined;
      }

      if (entityType === 'contact' && entityId) {
        actionable.push({
          question: t.createTaskForContact,
          action: t.createTaskAction(entityId),
          category: 'follow_up_creation',
          priority: 2,
          icon: 'Plus',
          tool_call_context: {
            tool_name: execution.name,
            tool_result: execution.result,
          },
        });
      }

      if (entityType === 'company' && entityId) {
        actionable.push({
          question: t.addContactForCompany,
          action: t.addContactAction(entityId),
          category: 'follow_up_creation',
          priority: 2,
          icon: 'Link',
          tool_call_context: {
            tool_name: execution.name,
            tool_result: execution.result,
          },
        });
      }
    }

    if (toolName.startsWith('search_')) {
      const entityType = toolName.replace('search_', '');
      actionable.push({
        question: t.refineSearch(entityType),
        action: t.refineSearchAction(entityType),
        category: 'search_refinement',
        priority: 3,
        icon: 'Filter',
        tool_call_context: {
          tool_name: execution.name,
          tool_result: execution.result,
        },
      });
    }

    if (toolName === 'get_documents_for_entity' && execution.args) {
      const entityType = String(execution.args.entity_type || 'entity');
      const entityId = String(execution.args.entity_id || 'current');
      actionable.push({
        question: t.viewDocuments(entityType),
        action: t.viewDocumentsAction(entityType, entityId),
        category: 'related_action',
        priority: 3,
        icon: 'FileText',
        tool_call_context: {
          tool_name: execution.name,
          tool_result: execution.result,
        },
      });
    }

    if (toolName === 'create_opportunity') {
      actionable.push({
        question: t.linkOpportunity,
        action: t.linkOpportunityAction(
          String(
            execution.args?.id ||
              execution.args?.opportunity_id ||
              execution.args?._id ||
              'opportunity'
          )
        ),
        category: 'related_action',
        priority: 3,
        icon: 'Link',
        tool_call_context: {
          tool_name: execution.name,
          tool_result: execution.result,
        },
      });
    }
  }

  return actionable;
}

