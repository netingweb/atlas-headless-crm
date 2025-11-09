import { ApiProperty } from '@nestjs/swagger';

export class TextSearchDto {
  @ApiProperty({
    description: 'Search query',
    example: 'John Doe',
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
    description: 'Results per page',
    example: 10,
    default: 10,
    required: false,
  })
  per_page?: number;

  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'Filter by expression',
    example: 'company_id:507f1f77bcf86cd799439011',
    required: false,
  })
  filter_by?: string;
}

export class TextSearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: 'array',
    items: {
      type: 'object',
    },
  })
  hits!: unknown[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 42,
  })
  found!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;
}

export class SemanticSearchResponseDto {
  @ApiProperty({
    description: 'Search results with scores',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        score: { type: 'number', example: 0.95 },
        payload: { type: 'object' },
      },
    },
  })
  results!: Array<{ id: string; score: number; payload: unknown }>;
}
