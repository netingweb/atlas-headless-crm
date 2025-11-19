import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Document title', example: 'Contract 2024' })
  title!: string;

  @ApiProperty({ description: 'Document type', example: 'contract' })
  document_type!: string;

  @ApiPropertyOptional({ description: 'Related entity type', example: 'opportunity' })
  related_entity_type?: string;

  @ApiPropertyOptional({ description: 'Related entity ID', example: '507f1f77bcf86cd799439011' })
  related_entity_id?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Document type' })
  document_type?: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  related_entity_type?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  related_entity_id?: string;
}

export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  _id!: string;

  @ApiProperty({ description: 'Document title' })
  title!: string;

  @ApiProperty({ description: 'MIME type' })
  mime_type!: string;

  @ApiProperty({ description: 'File size in bytes' })
  file_size!: number;

  @ApiProperty({ description: 'Storage path' })
  storage_path!: string;

  @ApiProperty({ description: 'Document type' })
  document_type!: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  related_entity_type?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  related_entity_id?: string;

  @ApiProperty({
    description: 'Processing status',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  processing_status!: string;

  @ApiPropertyOptional({ description: 'Extracted content' })
  extracted_content?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Created at' })
  created_at!: Date;

  @ApiProperty({ description: 'Updated at' })
  updated_at!: Date;
}
