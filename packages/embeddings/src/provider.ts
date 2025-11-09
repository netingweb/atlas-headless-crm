export interface EmbeddingsProvider {
  embedTexts(input: string[], options?: { model?: string }): Promise<number[][]>;
}

export type ProviderName = 'openai' | 'jina' | 'local';

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}
