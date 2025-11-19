import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import type { VisionProvider } from '@crm-atlas/types';
import { processImageWithVisionProvider } from './vision/factory';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  exif?: Record<string, unknown>;
}

export interface VisionExtractionResult {
  text?: string; // OCR extracted text
  description?: string; // Vision LLM description
  structuredData?: Record<string, unknown>; // Structured information extracted
  metadata: ImageMetadata;
}

/**
 * Extract metadata from image buffer
 */
export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    exif: metadata.exif ? JSON.parse(JSON.stringify(metadata.exif)) : undefined,
  };
}

/**
 * Process image with vision LLM
 */
export async function processImageWithVision(
  buffer: Buffer,
  visionProvider: VisionProvider,
  prompt?: string
): Promise<{ description: string; structuredData?: Record<string, unknown> }> {
  return processImageWithVisionProvider(buffer, visionProvider, prompt);
}

/**
 * Extract text from image using OCR (Tesseract.js)
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    // Tesseract.js supports multiple languages, defaulting to English
    // You can configure language via environment variable or config
    const lang = process.env.TESSERACT_LANG || 'eng';

    const { data } = await Tesseract.recognize(buffer, lang, {
      logger: (m) => {
        // Log progress in development
        if (process.env.NODE_ENV === 'development' && m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return data.text.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`OCR extraction failed: ${errorMessage}`);
  }
}
