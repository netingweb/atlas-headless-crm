import { Controller, Get, Post, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';
import { TenantContext } from '@crm-atlas/core';
import { IndexingService } from './indexing.service';

@ApiTags('indexing')
@Controller(':tenant/:unit/indexing')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Get('health')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Typesense health',
    description: 'Check if Typesense server is healthy and accessible.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Typesense health status',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async checkHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
    return this.indexingService.checkHealth();
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Typesense metrics',
    description: 'Get metrics and statistics about Typesense collections and documents.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Typesense metrics',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getMetrics(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<{
    collections: number;
    documents: number;
    collectionStats: Array<{
      name: string;
      numDocuments: number;
      createdAt: number;
      updatedAt: number;
    }>;
  }> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.indexingService.getMetrics(ctx);
  }

  @Post('backfill')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:write')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger backfill indexing',
    description: 'Manually trigger a full backfill of all entities to Typesense and Qdrant.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Backfill operation result',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async triggerBackfill(): Promise<{ success: boolean; message: string }> {
    return this.indexingService.triggerBackfill();
  }
}
