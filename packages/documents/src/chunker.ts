/**
 * Text chunking utilities for document processing
 */

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, options: ChunkingOptions): TextChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const chunks: TextChunk[] = [];

  if (text.length <= chunkSize) {
    return [
      {
        text,
        startIndex: 0,
        endIndex: text.length,
        chunkIndex: 0,
      },
    ];
  }

  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunkText = text.slice(startIndex, endIndex);

    chunks.push({
      text: chunkText,
      startIndex,
      endIndex,
      chunkIndex,
    });

    // Move start index forward by chunkSize - overlap
    startIndex += chunkSize - chunkOverlap;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Smart chunking that tries to break on sentence boundaries
 */
export function chunkTextSmart(text: string, options: ChunkingOptions): TextChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const chunks: TextChunk[] = [];

  if (text.length <= chunkSize) {
    return [
      {
        text,
        startIndex: 0,
        endIndex: text.length,
        chunkIndex: 0,
      },
    ];
  }

  // Sentence boundary regex (period, exclamation, question mark followed by space or newline)
  const sentenceBoundary = /[.!?]\s+/g;
  const sentences: Array<{ start: number; end: number; text: string }> = [];

  let match;
  let lastIndex = 0;

  while ((match = sentenceBoundary.exec(text)) !== null) {
    const end = match.index + match[0].length;
    sentences.push({
      start: lastIndex,
      end,
      text: text.slice(lastIndex, end),
    });
    lastIndex = end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    sentences.push({
      start: lastIndex,
      end: text.length,
      text: text.slice(lastIndex),
    });
  }

  // Group sentences into chunks
  let currentChunk: string[] = [];
  let currentSize = 0;
  let chunkStartIndex = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceSize = sentence.text.length;

    if (currentSize + sentenceSize <= chunkSize) {
      // Add to current chunk
      currentChunk.push(sentence.text);
      currentSize += sentenceSize;
    } else {
      // Save current chunk and start new one
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.join(''),
          startIndex: chunkStartIndex,
          endIndex: sentence.start,
          chunkIndex: chunkIndex++,
        });

        // Start new chunk with overlap
        const overlapText = currentChunk.slice(-Math.ceil(chunkOverlap / 100)).join('');
        currentChunk = [overlapText, sentence.text];
        currentSize = overlapText.length + sentenceSize;
        chunkStartIndex = sentence.start - overlapText.length;
      } else {
        // Single sentence is too large, split it
        const subChunks = chunkText(sentence.text, { chunkSize, chunkOverlap });
        for (const subChunk of subChunks) {
          chunks.push({
            text: subChunk.text,
            startIndex: sentence.start + subChunk.startIndex,
            endIndex: sentence.start + subChunk.endIndex,
            chunkIndex: chunkIndex++,
          });
        }
        currentChunk = [];
        currentSize = 0;
        chunkStartIndex = sentence.end;
      }
    }
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(''),
      startIndex: chunkStartIndex,
      endIndex: text.length,
      chunkIndex,
    });
  }

  return chunks;
}
