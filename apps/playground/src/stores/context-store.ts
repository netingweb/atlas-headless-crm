import { create } from 'zustand';

export interface ViewContext {
  route: string | null;
  entityType: string | null;
  entityId: string | null;
  entityData?: Record<string, unknown> | null;
}

interface ContextState {
  context: ViewContext;
  setContext: (context: Partial<ViewContext>) => void;
  clearContext: () => void;
}

const defaultContext: ViewContext = {
  route: null,
  entityType: null,
  entityId: null,
  entityData: null,
};

export const useContextStore = create<ContextState>((set) => ({
  context: defaultContext,
  setContext: (newContext: Partial<ViewContext>) => {
    set((state) => ({
      context: {
        ...state.context,
        ...newContext,
      },
    }));
  },
  clearContext: () => {
    set({ context: defaultContext });
  },
}));

/**
 * Parse route to extract entity type and ID
 * Examples:
 * - /entities/contact/123 -> { entityType: 'contact', entityId: '123' }
 * - /entities/company/456 -> { entityType: 'company', entityId: '456' }
 * - /entities/contact -> { entityType: 'contact', entityId: null }
 * - /entities -> { entityType: null, entityId: null }
 */
export function parseRoute(route: string): { entityType: string | null; entityId: string | null } {
  const match = route.match(/^\/entities\/([^/]+)(?:\/([^/]+))?/);
  if (!match) {
    return { entityType: null, entityId: null };
  }

  return {
    entityType: match[1] || null,
    entityId: match[2] || null,
  };
}

/**
 * Hook to get current context
 */
export function useCurrentContext(): ViewContext {
  return useContextStore((state) => state.context);
}
