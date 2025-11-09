import type { EmbeddingsProvider, ProviderConfig } from './provider';
export declare class JinaProvider implements EmbeddingsProvider {
  private apiKey;
  private baseUrl;
  private model;
  constructor(config: ProviderConfig);
  embedTexts(
    input: string[],
    options?: {
      model?: string;
    }
  ): Promise<number[][]>;
}
//# sourceMappingURL=jina-provider.d.ts.map
