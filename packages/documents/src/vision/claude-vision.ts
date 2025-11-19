import type { VisionProvider } from '@crm-atlas/types';

export interface VisionResult {
  description: string;
  structuredData?: Record<string, unknown>;
}

/**
 * Process image with Claude Vision (Anthropic)
 * Note: This is a placeholder implementation
 * Claude Vision API requires different approach than OpenAI
 */
export function processWithClaudeVision(
  _buffer: Buffer,
  visionConfig: VisionProvider,
  _prompt?: string
): Promise<VisionResult> {
  if (!visionConfig.apiKey) {
    throw new Error('Claude API key is required for vision processing');
  }

  // TODO: Implement Claude Vision API integration
  // Claude uses different API structure than OpenAI
  // This requires Anthropic SDK integration

  return Promise.reject(
    new Error('Claude Vision not yet implemented. Please use OpenAI Vision provider.')
  );
}
