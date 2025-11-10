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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { TriggerWorkflowDto } from './dto/trigger-workflow.dto';
import { UpdateWorkflowStatusDto } from './dto/update-status.dto';
import type { TenantContext } from '@crm-atlas/core';
import type { WorkflowDefinition, WorkflowExecutionLog } from '@crm-atlas/types';

@ApiTags('workflows')
@Controller(':tenant/:unit/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all workflows for a tenant/unit' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async getWorkflows(@Param() ctx: TenantContext): Promise<WorkflowDefinition[]> {
    return this.workflowsService.getWorkflows(ctx);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow definition' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflow(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.getWorkflow(ctx, workflowId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  @ApiResponse({ status: 400, description: 'Invalid workflow definition' })
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(
    @Param() ctx: TenantContext,
    @Body() createDto: CreateWorkflowDto
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.createWorkflow(ctx, createDto as any);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid workflow definition' })
  async updateWorkflow(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string,
    @Body() updateDto: UpdateWorkflowDto
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.updateWorkflow(ctx, workflowId, updateDto as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string
  ): Promise<void> {
    return this.workflowsService.deleteWorkflow(ctx, workflowId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update workflow status (enable/disable)' })
  @ApiResponse({ status: 200, description: 'Workflow status updated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async updateWorkflowStatus(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string,
    @Body() statusDto: UpdateWorkflowStatusDto
  ): Promise<WorkflowDefinition> {
    return this.workflowsService.updateWorkflowStatus(
      ctx,
      workflowId,
      statusDto.status,
      statusDto.enabled
    );
  }

  @Post(':id/run')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('workflows:execute')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger a workflow manually' })
  @ApiResponse({ status: 200, description: 'Workflow triggered' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async triggerWorkflow(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string,
    @Body() triggerDto: TriggerWorkflowDto
  ): Promise<{ execution_id: string }> {
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
  @ApiOperation({ summary: 'Get execution logs for a workflow' })
  @ApiResponse({ status: 200, description: 'List of execution logs' })
  async getWorkflowExecutions(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<WorkflowExecutionLog[]> {
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
  @ApiResponse({ status: 200, description: 'Execution log' })
  @ApiResponse({ status: 404, description: 'Execution log not found' })
  async getExecutionLog(@Param('logId') logId: string): Promise<WorkflowExecutionLog> {
    return this.workflowsService.getExecutionLog(logId);
  }

  @Get('executions')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get execution logs for a tenant' })
  @ApiResponse({ status: 200, description: 'List of execution logs' })
  async getTenantExecutions(
    @Param() ctx: TenantContext,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
    @Query('triggerType') triggerType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<WorkflowExecutionLog[]> {
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

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, ScopesGuard)
  @AuthScopes('crm:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow statistics' })
  async getWorkflowStats(
    @Param() ctx: TenantContext,
    @Param('id') workflowId: string
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    average_duration_ms: number;
    last_execution: string | null;
  }> {
    return this.workflowsService.getWorkflowStats(ctx, workflowId);
  }
}
