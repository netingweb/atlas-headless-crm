import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status!: string;

  @ApiProperty({
    description: 'Timestamp of the health check',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Status of individual services',
    example: {
      mongodb: 'ok',
      redis: 'ok',
      typesense: 'ok',
      qdrant: 'ok',
    },
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
  })
  services!: Record<string, string>;
}

export class ReadinessResponseDto {
  @ApiProperty({
    description: 'Whether the service is ready',
    example: true,
  })
  ready!: boolean;
}

export class LivenessResponseDto {
  @ApiProperty({
    description: 'Whether the service is alive',
    example: true,
  })
  alive!: boolean;
}
