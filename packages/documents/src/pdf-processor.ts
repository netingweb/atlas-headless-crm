import pdfParse from 'pdf-parse';

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modDate?: Date;
  pages: number;
}

export interface PDFExtractionResult {
  text: string;
  metadata: PDFMetadata;
}

/**
 * Extract text and metadata from PDF buffer
 */
export async function extractPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  const data = await pdfParse(buffer);

  const metadata: PDFMetadata = {
    title: data.info?.Title,
    author: data.info?.Author,
    subject: data.info?.Subject,
    keywords: data.info?.Keywords,
    creator: data.info?.Creator,
    producer: data.info?.Producer,
    creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
    modDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
    pages: data.numpages,
  };

  return {
    text: data.text,
    metadata,
  };
}
