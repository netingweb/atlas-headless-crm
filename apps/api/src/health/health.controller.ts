import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { getDb } from '@crm-atlas/db';
import {
  HealthResponseDto,
  ReadinessResponseDto,
  LivenessResponseDto,
} from '../common/dto/health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Check the health status of the API and its dependencies.',
  })
  @ApiOkResponse({
    description: 'Health status',
    type: HealthResponseDto,
  })
  async check(): Promise<HealthResponseDto> {
    const services: Record<string, string> = {};

    try {
      const db = getDb();
      await db.admin().ping();
      services.mongodb = 'ok';
    } catch (error) {
      services.mongodb = 'error';
    }

    return {
      status: services.mongodb === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check endpoint',
    description: 'Check if the service is ready to accept traffic.',
  })
  @ApiOkResponse({
    description: 'Readiness status',
    type: ReadinessResponseDto,
  })
  async ready(): Promise<ReadinessResponseDto> {
    try {
      const db = getDb();
      await db.admin().ping();
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check endpoint',
    description: 'Check if the service is alive (always returns true).',
  })
  @ApiOkResponse({
    description: 'Liveness status',
    type: LivenessResponseDto,
  })
  live(): LivenessResponseDto {
    return { alive: true };
  }
}
