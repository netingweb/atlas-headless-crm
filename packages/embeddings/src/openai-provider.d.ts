import type { EmbeddingsProvider, ProviderConfig } from './provider';
export declare class OpenAIProvider implements EmbeddingsProvider {
  private client;
  constructor(config: ProviderConfig);
  embedTexts(
    input: string[],
    options?: {
      model?: string;
    }
  ): Promise<number[][]>;
}
//# sourceMappingURL=openai-provider.d.ts.map
