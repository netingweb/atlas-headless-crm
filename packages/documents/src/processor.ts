import { extractPDF, type PDFExtractionResult } from './pdf-processor';
import {
  extractImageMetadata,
  extractTextFromImage,
  processImageWithVision,
} from './image-processor';
import { chunkTextSmart, type ChunkingOptions } from './chunker';
import type { DocumentTypeConfig, VisionProvider } from '@crm-atlas/types';
import mammoth from 'mammoth';

export interface ProcessingOptions {
  documentType?: DocumentTypeConfig;
  chunkingOptions?: ChunkingOptions;
  enableVision?: boolean;
  enableOCR?: boolean;
  visionProvider?: VisionProvider;
  visionPrompt?: string;
}

export interface ProcessingResult {
  text: string;
  chunks?: Array<{ text: string; startIndex: number; endIndex: number; chunkIndex: number }>;
  metadata?: Record<string, unknown>;
  visionData?: {
    description?: string;
    structuredData?: Record<string, unknown>;
  };
}

/**
 * Process document buffer based on mime type
 */
export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const { documentType, chunkingOptions, enableVision, enableOCR, visionProvider, visionPrompt } =
    options;

  // Determine processing strategy based on mime type
  if (mimeType === 'application/pdf') {
    return processPDF(buffer, chunkingOptions);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return processDOCX(buffer, chunkingOptions);
  } else if (mimeType.startsWith('image/')) {
    return processImage(buffer, mimeType, {
      enableVision,
      enableOCR,
      visionProvider,
      visionPrompt,
      documentType,
    });
  } else if (mimeType === 'text/plain' || mimeType === 'text/csv') {
    return processText(buffer, chunkingOptions);
  } else {
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}

/**
 * Process PDF document
 */
async function processPDF(
  buffer: Buffer,
  chunkingOptions?: ChunkingOptions
): Promise<ProcessingResult> {
  const pdfResult: PDFExtractionResult = await extractPDF(buffer);

  let chunks;
  if (chunkingOptions) {
    chunks = chunkTextSmart(pdfResult.text, chunkingOptions);
  }

  return {
    text: pdfResult.text,
    chunks,
    metadata: {
      ...pdfResult.metadata,
      type: 'pdf',
    },
  };
}

/**
 * Process DOCX document
 */
async function processDOCX(
  buffer: Buffer,
  chunkingOptions?: ChunkingOptions
): Promise<ProcessingResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  let chunks;
  if (chunkingOptions) {
    chunks = chunkTextSmart(text, chunkingOptions);
  }

  return {
    text,
    chunks,
    metadata: {
      type: 'docx',
    },
  };
}

/**
 * Process image document
 */
async function processImage(
  buffer: Buffer,
  mimeType: string,
  options: {
    enableVision?: boolean;
    enableOCR?: boolean;
    visionProvider?: VisionProvider;
    visionPrompt?: string;
    documentType?: DocumentTypeConfig;
  }
): Promise<ProcessingResult> {
  const { enableVision, enableOCR, visionProvider, visionPrompt, documentType } = options;

  const metadata = await extractImageMetadata(buffer);
  let text = '';
  let visionData: { description?: string; structuredData?: Record<string, unknown> } | undefined;

  // Extract text via OCR if enabled
  if (enableOCR || documentType?.ocr_enabled) {
    try {
      text = await extractTextFromImage(buffer);
    } catch (error) {
      console.warn('OCR extraction failed:', error);
    }
  }

  // Process with vision LLM if enabled
  if (enableVision || documentType?.vision_enabled) {
    if (!visionProvider) {
      throw new Error('Vision provider required for vision processing');
    }

    try {
      const visionResult = await processImageWithVision(buffer, visionProvider, visionPrompt);
      visionData = {
        description: visionResult.description,
        structuredData: visionResult.structuredData,
      };
    } catch (error) {
      console.warn('Vision processing failed:', error);
    }
  }

  // Combine OCR text and vision description for embedding
  const combinedText = [text, visionData?.description].filter(Boolean).join('\n\n');

  return {
    text: combinedText || text,
    metadata: {
      ...metadata,
      type: 'image',
      mimeType,
    },
    visionData,
  };
}

/**
 * Process plain text document
 */
function processText(buffer: Buffer, chunkingOptions?: ChunkingOptions): ProcessingResult {
  const text = buffer.toString('utf-8');

  let chunks;
  if (chunkingOptions) {
    chunks = chunkTextSmart(text, chunkingOptions);
  }

  return {
    text,
    chunks,
    metadata: {
      type: 'text',
    },
  };
}
