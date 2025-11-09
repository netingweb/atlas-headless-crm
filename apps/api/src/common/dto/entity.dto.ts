import { ApiProperty } from '@nestjs/swagger';

export class CreateEntityDto {
  // Index signature for dynamic entity fields
  // Note: ValidationPipe with forbidNonWhitelisted will be disabled for this DTO
  // using a custom pipe in the controller
  [key: string]: unknown;
}

export class UpdateEntityDto {
  // Index signature for dynamic entity fields
  // Note: ValidationPipe with forbidNonWhitelisted will be disabled for this DTO
  // using a custom pipe in the controller
  [key: string]: unknown;
}

export class EntityResponseDto {
  @ApiProperty({
    description: 'Entity ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id!: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: 'demo',
  })
  tenant_id!: string;

  @ApiProperty({
    description: 'Unit ID',
    example: 'sales',
  })
  unit_id!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updated_at!: string;

  // Index signature for dynamic entity fields
  [key: string]: unknown;
}
