import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { StatsService } from './stats.service';
import type { TenantContext } from '@crm-atlas/core';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';

@ApiTags('stats')
@Controller(':tenant/:unit/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Returns KPI statistics for the dashboard including entity counts and recent activity.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Dashboard statistics',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getStats(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<StatsResponse> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.statsService.getStats(ctx);
  }

  @Get('notes/recent')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recent notes',
    description: 'Returns the most recent notes for the dashboard.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of notes to return',
    example: 10,
    required: false,
  })
  @ApiOkResponse({
    description: 'List of recent notes',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getRecentNotes(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query('limit') limit?: string
  ): Promise<unknown[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.statsService.getRecentNotes(ctx, limitNum);
  }
}
