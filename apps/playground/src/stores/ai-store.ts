import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'openai' | 'azure';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIState {
  config: AIConfig | null;
  disabledTools: Set<string>; // Set of disabled tool names (empty = all enabled)
  maxContextTokens: number; // Max tokens before summarization
  setConfig: (config: AIConfig) => void;
  clearConfig: () => void;
  toggleTool: (toolName: string) => void;
  setToolEnabled: (toolName: string, enabled: boolean) => void;
  enableAllTools: () => void;
  disableAllTools: (allToolNames: string[]) => void;
  setMaxContextTokens: (tokens: number) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      config: null,
      disabledTools: new Set<string>(), // Empty set = all tools enabled
      maxContextTokens: 8000, // Default: 8000 tokens
      setConfig: (config: AIConfig) => {
        console.log('[AIStore] Saving config:', {
          provider: config.provider,
          model: config.model,
          hasApiKey: !!config.apiKey,
          apiKeyLength: config.apiKey?.length,
          apiKeyPrefix: config.apiKey?.substring(0, 7) + '...',
        });
        set({ config });
      },
      clearConfig: () => {
        set({ config: null });
      },
      toggleTool: (toolName: string) => {
        const current = get().disabledTools;
        const newSet = new Set(current);
        if (newSet.has(toolName)) {
          newSet.delete(toolName); // Enable tool
        } else {
          newSet.add(toolName); // Disable tool
        }
        set({ disabledTools: newSet });
      },
      setToolEnabled: (toolName: string, enabled: boolean) => {
        const current = get().disabledTools;
        const newSet = new Set(current);
        if (enabled) {
          newSet.delete(toolName); // Remove from disabled set
        } else {
          newSet.add(toolName); // Add to disabled set
        }
        set({ disabledTools: newSet });
      },
      enableAllTools: () => {
        set({ disabledTools: new Set<string>() }); // Empty set = all enabled
      },
      disableAllTools: (allToolNames: string[]) => {
        set({ disabledTools: new Set(allToolNames) }); // All tools disabled
      },
      setMaxContextTokens: (tokens: number) => {
        set({ maxContextTokens: tokens });
      },
    }),
    {
      name: 'ai-config-storage',
      partialize: (state) => ({
        config: state.config,
        disabledTools: Array.from(state.disabledTools), // Convert Set to Array for persistence
        maxContextTokens: state.maxContextTokens,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert Array back to Set after rehydration
        if (state && state.disabledTools) {
          state.disabledTools = new Set(state.disabledTools as unknown as string[]);
        } else if (state) {
          state.disabledTools = new Set<string>();
        }
        // Log rehydration for debugging
        if (state?.config) {
          console.log('[AIStore] Config rehydrated from storage:', {
            provider: state.config.provider,
            model: state.config.model,
            hasApiKey: !!state.config.apiKey,
            apiKeyLength: state.config.apiKey?.length,
            apiKeyPrefix: state.config.apiKey?.substring(0, 7) + '...',
          });
        } else {
          console.log('[AIStore] No config found in storage');
        }
      },
    }
  )
);

// Provider-specific model options
export const providerModels: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  azure: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
};
