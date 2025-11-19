import OpenAI from 'openai';
import type { VisionProvider } from '@crm-atlas/types';

export interface VisionResult {
  description: string;
  structuredData?: Record<string, unknown>;
}

/**
 * Process image with OpenAI GPT-4 Vision
 */
export async function processWithOpenAIVision(
  buffer: Buffer,
  visionConfig: VisionProvider,
  prompt?: string
): Promise<VisionResult> {
  // Use API key from config or fallback to environment variable
  const apiKey = visionConfig.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OpenAI API key is required for vision processing. Set it in tenant config or OPENAI_API_KEY environment variable.'
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: visionConfig.baseUrl,
  });

  // Use model from config or default to gpt-4o (or gpt-4-vision-preview for compatibility)
  const model = visionConfig.model || process.env.OPENAI_VISION_MODEL || 'gpt-4o';

  // Convert buffer to base64
  const base64Image = buffer.toString('base64');
  const mimeType = 'image/png'; // Default, could be detected from buffer

  // Default prompt if not provided
  const defaultPrompt =
    'Analyze this image and provide a detailed description. Extract any visible text, identify objects, people, or scenes, and describe the overall content. If there are forms, documents, or structured data, extract it in a structured format.';

  const visionPrompt = prompt || defaultPrompt;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: visionPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const description = response.choices[0]?.message?.content || '';

    // Try to parse structured data from the response
    let structuredData: Record<string, unknown> | undefined;
    try {
      // Look for JSON in the response
      const jsonMatch = description.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, just use the description
    }

    return {
      description,
      structuredData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`OpenAI Vision API error: ${errorMessage}`);
  }
}
