import { Controller, Get, Post, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@crm-atlas/auth';
import { TenantContext } from '@crm-atlas/core';
import { IndexingService } from './indexing.service';

@ApiTags('indexing')
@Controller(':tenant/:unit/indexing')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Get('health')
  @UseGuards(JwtAuthGuard)
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
  async checkHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
    return this.indexingService.checkHealth();
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  async triggerBackfill(): Promise<{ success: boolean; message: string }> {
    return this.indexingService.triggerBackfill();
  }
}
