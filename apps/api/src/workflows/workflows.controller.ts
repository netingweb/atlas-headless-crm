import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { TriggerWorkflowDto } from './dto/trigger-workflow.dto';
import { UpdateWorkflowStatusDto } from './dto/update-status.dto';
import { TestWorkflowDto } from './dto/test-workflow.dto';
import type { TenantContext } from '@crm-atlas/core';
import type { WorkflowDefinition, WorkflowExecutionLog } from '@crm-atlas/types';
import type { AuthenticatedRequest } from '@crm-atlas/auth';
import { Request } from '@nestjs/common';

@ApiTags('workflows')
@Controller(':tenant/:unit/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOperation({
    summary: 'Get all workflows for a tenant/unit',
    description: 'Retrieve all workflow definitions for the specified tenant and unit.',
  })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async getWorkflows(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<WorkflowDefinition[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.getWorkflows(ctx);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Get a workflow by ID',
    description: 'Retrieve a specific workflow definition by its ID.',
  })
  @ApiResponse({ status: 200, description: 'Workflow definition' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflow(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string
  ): Promise<WorkflowDefinition> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.getWorkflow(ctx, workflowId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOperation({
    summary: 'Create a new workflow',
    description: 'Create a new workflow definition for automation and business logic.',
  })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  @ApiResponse({ status: 400, description: 'Invalid workflow definition' })
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Body() createDto: CreateWorkflowDto
  ): Promise<WorkflowDefinition> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.createWorkflow(ctx, createDto as any);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Update a workflow',
    description: 'Update an existing workflow definition.',
  })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid workflow definition' })
  async updateWorkflow(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string,
    @Body() updateDto: UpdateWorkflowDto
  ): Promise<WorkflowDefinition> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.updateWorkflow(ctx, workflowId, updateDto as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Delete a workflow',
    description: 'Permanently delete a workflow definition.',
  })
  @ApiResponse({ status: 204, description: 'Workflow deleted' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string
  ): Promise<void> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.deleteWorkflow(ctx, workflowId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Update workflow status (enable/disable)',
    description: 'Enable or disable a workflow without modifying its definition.',
  })
  @ApiResponse({ status: 200, description: 'Workflow status updated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async updateWorkflowStatus(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string,
    @Body() statusDto: UpdateWorkflowStatusDto
  ): Promise<WorkflowDefinition> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.updateWorkflowStatus(
      ctx,
      workflowId,
      statusDto.status,
      statusDto.enabled
    );
  }

  @Post(':id/test')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Test/simulate workflow execution without executing it',
    description:
      'Simulate workflow execution with test data to verify logic without creating actual execution logs.',
  })
  @ApiResponse({ status: 200, description: 'Workflow test simulation result' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async testWorkflow(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string,
    @Body() testDto: TestWorkflowDto,
    @Request() req: AuthenticatedRequest
  ): Promise<unknown> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    const userInfo = {
      userId: req.user?.sub,
      email: undefined, // JwtPayload doesn't include email, would need to fetch from DB
      name: undefined, // JwtPayload doesn't include name, would need to fetch from DB
    };
    return this.workflowsService.testWorkflow(ctx, workflowId, testDto.context || {}, userInfo);
  }

  @Post(':id/run')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:execute')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Trigger a workflow manually',
    description: 'Manually trigger a workflow execution with custom context data.',
  })
  @ApiResponse({ status: 200, description: 'Workflow triggered and queued for execution' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async triggerWorkflow(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string,
    @Body() triggerDto: TriggerWorkflowDto
  ): Promise<{ execution_id: string; message: string }> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.triggerWorkflow(
      ctx,
      workflowId,
      triggerDto.context || {},
      triggerDto.actor
    );
  }

  @Get(':id/executions')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Get execution logs for a workflow',
    description: 'Retrieve execution logs for a specific workflow with pagination support.',
  })
  @ApiResponse({ status: 200, description: 'List of execution logs' })
  async getWorkflowExecutions(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<WorkflowExecutionLog[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.getWorkflowExecutions(
      ctx,
      workflowId,
      limit ? parseInt(String(limit), 10) : 100,
      offset ? parseInt(String(offset), 10) : 0
    );
  }

  @Get('executions/:logId')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an execution log by ID' })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'logId', description: 'Execution log ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({ status: 200, description: 'Execution log' })
  @ApiResponse({ status: 404, description: 'Execution log not found' })
  async getExecutionLog(
    @Param('tenant') _tenant: string,
    @Param('unit') _unit: string,
    @Param('logId') logId: string
  ): Promise<WorkflowExecutionLog> {
    return this.workflowsService.getExecutionLog(logId);
  }

  @Get('executions')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOperation({
    summary: 'Get execution logs for a tenant',
    description:
      'Retrieve all execution logs for a tenant/unit with filtering and pagination support.',
  })
  @ApiResponse({ status: 200, description: 'List of execution logs' })
  async getTenantExecutions(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
    @Query('triggerType') triggerType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<WorkflowExecutionLog[]> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.getTenantExecutions(
      ctx,
      limit ? parseInt(String(limit), 10) : 100,
      offset ? parseInt(String(offset), 10) : 0,
      {
        workflowId,
        status,
        triggerType,
        startDate,
        endDate,
      }
    );
  }

  @Delete('executions')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOperation({
    summary: 'Delete all execution logs for a tenant',
    description: 'Permanently delete all execution logs for the specified tenant and unit.',
  })
  @ApiResponse({ status: 200, description: 'Number of deleted execution logs' })
  async deleteAllExecutions(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<{ deletedCount: number }> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.deleteAllExecutions(ctx);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'id', description: 'Workflow ID', example: '507f1f77bcf86cd799439011' })
  @ApiOperation({
    summary: 'Get workflow statistics',
    description:
      'Retrieve execution statistics for a workflow including success rate and average duration.',
  })
  @ApiResponse({ status: 200, description: 'Workflow statistics' })
  async getWorkflowStats(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('id') workflowId: string
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    average_duration_ms: number;
    last_execution: string | null;
  }> {
    const ctx: TenantContext = { tenant_id: tenant, unit_id: unit };
    return this.workflowsService.getWorkflowStats(ctx, workflowId);
  }
}
