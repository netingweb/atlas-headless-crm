import { Controller, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import type { TenantContext } from '@crm-atlas/core';
import {
  TextSearchDto,
  TextSearchResponseDto,
  SemanticSearchResponseDto,
} from '../common/dto/search.dto';
import { HybridSearchDto, HybridSearchResponseDto } from './hybrid-search.dto';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GlobalSearchDto {
  @ApiProperty({
    description: 'Search query',
    example: 'test',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  q!: string;

  @ApiProperty({
    description: 'Maximum number of results per entity',
    example: 5,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

@ApiTags('search')
@Controller(':tenant/:unit/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('text')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'Full-text search',
    description: 'Perform a full-text search across entity documents using Typesense.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiBody({ type: TextSearchDto })
  @ApiOkResponse({
    description: 'Search results',
    type: TextSearchResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async textSearch(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Body() query: TextSearchDto
  ): Promise<TextSearchResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.searchService.textSearch(ctx, query) as Promise<TextSearchResponseDto>;
  }

  @Post('semantic')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'Semantic search using embeddings',
    description:
      'Perform semantic search using vector embeddings. Requires OpenAI or Jina API key configured.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiQuery({ name: 'entity', description: 'Entity name', example: 'contact', required: true })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    example: 'interested customer',
    required: true,
  })
  @ApiQuery({ name: 'limit', description: 'Result limit', example: 10, required: false })
  @ApiOkResponse({
    description: 'Semantic search results with similarity scores',
    type: SemanticSearchResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async semanticSearch(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query('entity') entity: string,
    @Query('q') query: string,
    @Query('limit') limit?: string
  ): Promise<SemanticSearchResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    const results = await this.searchService.semanticSearch(
      ctx,
      entity,
      query,
      limit ? parseInt(limit, 10) : 10
    );
    return { results } as SemanticSearchResponseDto;
  }

  @Post('hybrid')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'Hybrid search (full-text + semantic)',
    description:
      'Perform a hybrid search combining semantic and full-text search with weighted scoring for optimal results.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiBody({ type: HybridSearchDto })
  @ApiOkResponse({
    description: 'Hybrid search results with combined scores',
    type: HybridSearchResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async hybridSearch(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Body() query: HybridSearchDto
  ): Promise<HybridSearchResponseDto> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    const results = await this.searchService.hybridSearch(
      ctx,
      query.entity,
      query.q,
      query.semantic_weight,
      query.text_weight,
      query.limit
    );
    return results as HybridSearchResponseDto;
  }

  @Post('global')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiOperation({
    summary: 'Global search across all entities',
    description: 'Search across all entity types simultaneously using full-text search.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiBody({ type: GlobalSearchDto })
  @ApiOkResponse({
    description: 'Global search results grouped by entity type',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth()
  async globalSearch(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Body() body: GlobalSearchDto
  ): Promise<Array<{ entity: string; items: unknown[] }>> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.searchService.globalSearch(ctx, body.q, body.limit || 10);
  }
}
