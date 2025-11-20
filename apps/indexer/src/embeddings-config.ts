import type { ProviderConfig } from '@crm-atlas/embeddings';
import { getProviderConfig } from '@crm-atlas/embeddings';

function hasApiKey(provider?: ProviderConfig | null): boolean {
  return Boolean(provider?.apiKey && provider.apiKey.trim().length > 0);
}

export function ensureEmbeddingsApiKey(
  tenantId: string,
  tenantProvider?: ProviderConfig | null
): void {
  const globalProvider = getProviderConfig();

  if (hasApiKey(globalProvider) || hasApiKey(tenantProvider)) {
    return;
  }

  throw new Error(
    [
      `[Indexer] Missing OpenAI API key for tenant "${tenantId}".`,
      'Set the variable before launching the indexer:',
      '',
      'OPENAI_API_KEY=sk-*** pnpm tsx apps/indexer/src/backfill.ts',
      '',
      'or update tenant_config.embeddingsProvider with a valid apiKey.',
    ].join('\n')
  );
}
