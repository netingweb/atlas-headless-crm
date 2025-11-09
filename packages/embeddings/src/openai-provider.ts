import OpenAI from 'openai';
import type { EmbeddingsProvider, ProviderConfig } from './provider';

export class OpenAIProvider implements EmbeddingsProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async embedTexts(input: string[], options?: { model?: string }): Promise<number[][]> {
    const model = options?.model || 'text-embedding-3-small';
    const response = await this.client.embeddings.create({
      model,
      input,
    });

    return response.data.map((item) => item.embedding);
  }
}
