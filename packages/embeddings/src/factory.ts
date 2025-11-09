import type { EmbeddingsProvider, ProviderConfig, ProviderName } from './provider';
import { OpenAIProvider } from './openai-provider';
import { JinaProvider } from './jina-provider';

export function createEmbeddingsProvider(
  globalCfg: ProviderConfig,
  tenantOverride?: ProviderConfig
): EmbeddingsProvider {
  const cfg: ProviderConfig = tenantOverride?.name
    ? { ...globalCfg, ...tenantOverride }
    : globalCfg;

  switch (cfg.name) {
    case 'openai':
      return new OpenAIProvider(cfg);
    case 'jina':
      return new JinaProvider(cfg);
    case 'local':
      throw new Error('Local provider not yet implemented');
    default:
      throw new Error(`Unsupported provider: ${cfg.name}`);
  }
}

export function getProviderConfig(): ProviderConfig {
  const providerName = (process.env.EMBEDDINGS_PROVIDER || 'openai') as ProviderName;
  const config: ProviderConfig = {
    name: providerName,
  };

  switch (providerName) {
    case 'openai':
      config.apiKey = process.env.OPENAI_API_KEY;
      config.model = process.env.OPENAI_MODEL || 'text-embedding-3-small';
      break;
    case 'jina':
      config.apiKey = process.env.JINA_API_KEY;
      config.model = process.env.JINA_MODEL || 'jina-embeddings-v2-base-en';
      config.baseUrl = process.env.JINA_BASE_URL || 'https://api.jina.ai/v1';
      break;
  }

  return config;
}
