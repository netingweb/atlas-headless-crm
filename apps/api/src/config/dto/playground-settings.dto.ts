import {
  IsOptional,
  IsObject,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AIConfigDto {
  @ApiProperty({ enum: ['openai', 'azure'] })
  @IsEnum(['openai', 'azure'])
  provider!: 'openai' | 'azure';

  @ApiProperty()
  @IsString()
  apiKey!: string;

  @ApiProperty()
  @IsString()
  model!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8000)
  maxTokens?: number;
}

export class MCPToolsConfigDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledTools?: string[];
}

export class FieldVisibilityDto {
  @ApiProperty()
  @IsBoolean()
  visibleInList!: boolean;

  @ApiProperty()
  @IsBoolean()
  visibleInDetail!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visibleInReference?: boolean;
}

export class EntityVisibilityDto {
  @ApiProperty()
  @IsBoolean()
  visibleInMenu!: boolean;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/FieldVisibilityDto' },
  })
  @IsObject()
  fields!: Record<string, FieldVisibilityDto>;
}

export class TenantPlaygroundSettingsDto {
  @ApiPropertyOptional({ type: AIConfigDto })
  @IsOptional()
  @IsObject()
  ai?: AIConfigDto;

  @ApiPropertyOptional({ type: MCPToolsConfigDto })
  @IsOptional()
  @IsObject()
  mcpTools?: MCPToolsConfigDto;
}

export class UnitPlaygroundSettingsDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/EntityVisibilityDto' },
  })
  @IsOptional()
  @IsObject()
  entityVisibility?: Record<string, EntityVisibilityDto>;
}
