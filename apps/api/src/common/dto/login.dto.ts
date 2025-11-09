import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: 'demo',
    required: true,
  })
  tenant_id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'admin@demo.local',
    required: true,
  })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'changeme',
    required: true,
    format: 'password',
  })
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;
}
