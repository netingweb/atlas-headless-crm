import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: 'demo',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  tenant_id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'admin@demo.local',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'changeme',
    required: true,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;
}
