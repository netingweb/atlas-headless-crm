import { ApiProperty } from '@nestjs/swagger';

export class HybridSearchDto {
  @ApiProperty({
    description: 'Search query',
    example: 'interested customer',
    required: true,
  })
  q!: string;

  @ApiProperty({
    description: 'Entity name to search in',
    example: 'contact',
    required: true,
  })
  entity!: string;

  @ApiProperty({
    description: 'Weight for semantic search (0.0 to 1.0)',
    example: 0.7,
    default: 0.7,
    required: false,
  })
  semantic_weight?: number;

  @ApiProperty({
    description: 'Weight for full-text search (0.0 to 1.0)',
    example: 0.3,
    default: 0.3,
    required: false,
  })
  text_weight?: number;

  @ApiProperty({
    description: 'Maximum number of results',
    example: 10,
    default: 10,
    required: false,
  })
  limit?: number;
}

export class HybridSearchResultDto {
  @ApiProperty({
    description: 'Document ID',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'Combined score from semantic and text search',
    example: 0.85,
  })
  score!: number;

  @ApiProperty({
    description: 'Semantic search score',
    example: 0.92,
  })
  semantic_score!: number;

  @ApiProperty({
    description: 'Full-text search score',
    example: 0.75,
  })
  text_score!: number;

  @ApiProperty({
    description: 'Document data',
    type: 'object',
  })
  document!: Record<string, unknown>;
}

export class HybridSearchResponseDto {
  @ApiProperty({
    description: 'Search results with combined scores',
    type: [HybridSearchResultDto],
  })
  results!: HybridSearchResultDto[];

  @ApiProperty({
    description: 'Total number of results',
    example: 15,
  })
  total!: number;
}
