import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, ScopesGuard, AuthScopes } from '@crm-atlas/auth';
import { DocumentProcessingWorker } from './documents.worker';

@ApiTags('documents')
@Controller(':tenant/:unit/documents/queue')
@UseGuards(JwtAuthGuard, ScopesGuard)
@AuthScopes('documents:read')
@ApiBearerAuth()
export class DocumentsQueueController {
  constructor(private readonly worker: DocumentProcessingWorker) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get queue statistics',
    description:
      'Get statistics about the document processing queue (waiting, active, completed, failed jobs).',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Queue statistics',
    schema: {
      type: 'object',
      properties: {
        waiting: { type: 'number', example: 2 },
        active: { type: 'number', example: 1 },
        completed: { type: 'number', example: 10 },
        failed: { type: 'number', example: 1 },
        delayed: { type: 'number', example: 0 },
      },
    },
  })
  async getQueueStats(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string
  ): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.worker.getQueueStats(tenant, unit);
  }

  @Get('jobs/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get jobs for a document',
    description: 'Get all queue jobs (waiting, active, completed, failed) for a specific document.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiOkResponse({
    description: 'List of jobs for the document',
  })
  async getDocumentJobs(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Param('documentId') documentId: string
  ): Promise<unknown[]> {
    const jobs = await this.worker.getJobsForDocument(tenant, unit, documentId);
    const jobsWithState = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        state: await job.getState(),
        progress: job.progress,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }))
    );
    return jobsWithState;
  }

  @Post('clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean old completed and failed jobs',
    description:
      'Remove completed and failed jobs older than the specified grace period (default: 24 hours). Use grace=0 to remove all.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'Number of jobs cleaned',
    schema: {
      type: 'object',
      properties: {
        completed: { type: 'number', example: 5 },
        failed: { type: 'number', example: 2 },
      },
    },
  })
  async cleanOldJobs(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query('grace') grace?: string
  ): Promise<{ completed: number; failed: number }> {
    const graceMs = grace ? parseInt(grace, 10) : undefined;
    if (graceMs === 0) {
      return this.worker.cleanAllCompletedAndFailed(tenant, unit);
    }
    return this.worker.cleanOldJobs(tenant, unit, graceMs);
  }

  @Get('jobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all queue jobs',
    description: 'Get all jobs from the queue (waiting, active, completed, failed) with details.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'List of jobs with details',
  })
  async getAllJobs(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query('states') states?: string,
    @Query('limit') limit?: string
  ): Promise<unknown[]> {
    const validStates: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = [
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ];
    const statesArray = states
      ? (states.split(',').filter((s) => validStates.includes(s as any)) as Array<
          'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
        >)
      : (['waiting', 'active', 'failed'] as Array<'waiting' | 'active' | 'failed'>);
    const limitNum = limit ? parseInt(limit, 10) : 100;

    const jobs = await this.worker.getAllJobs(tenant, unit, statesArray, limitNum);
    const jobsWithDetails = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id,
          name: job.name,
          data: job.data,
          state,
          progress: job.progress,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
          opts: job.opts,
        };
      })
    );
    return jobsWithDetails;
  }

  @Get('failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get failed jobs',
    description: 'Get all failed jobs with error details.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'demo' })
  @ApiParam({ name: 'unit', description: 'Unit ID', example: 'sales' })
  @ApiOkResponse({
    description: 'List of failed jobs with error details',
  })
  async getFailedJobs(
    @Param('tenant') tenant: string,
    @Param('unit') unit: string,
    @Query('limit') limit?: string
  ): Promise<unknown[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const jobs = await this.worker.getFailedJobs(tenant, unit, limitNum);
    const jobsWithDetails = await Promise.all(
      jobs.map(async (job) => {
        return {
          id: job.id,
          name: job.name,
          data: job.data,
          state: await job.getState(),
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade,
        };
      })
    );
    return jobsWithDetails;
  }
}
