import type { VisionProvider } from '@crm-atlas/types';
import { processWithOpenAIVision } from './openai-vision';
import { processWithClaudeVision } from './claude-vision';
import type { VisionResult } from './openai-vision';

/**
 * Factory function to create vision processor based on provider
 */
export async function processImageWithVisionProvider(
  buffer: Buffer,
  visionConfig: VisionProvider,
  prompt?: string
): Promise<VisionResult> {
  switch (visionConfig.name) {
    case 'openai':
      return processWithOpenAIVision(buffer, visionConfig, prompt);
    case 'claude':
      return processWithClaudeVision(buffer, visionConfig, prompt);
    default:
      throw new Error(`Unsupported vision provider: ${visionConfig.name}`);
  }
}
