import { PipeTransform, Injectable, ArgumentMetadata, Type } from '@nestjs/common';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { CreateEntityDto, UpdateEntityDto } from '../dto/entity.dto';
import { CallToolDto } from '../../mcp/mcp.controller';

@Injectable()
export class SmartValidationPipe implements PipeTransform<unknown> {
  private readonly validationPipe: ValidationPipe;
  private readonly dynamicEntityTypes: Set<Type<unknown>>;
  private readonly callToolDtoType: Type<unknown>;

  constructor(options?: ValidationPipeOptions) {
    this.validationPipe = new ValidationPipe(options);
    // Store references to dynamic entity DTO types
    this.dynamicEntityTypes = new Set([CreateEntityDto, UpdateEntityDto]);
    this.callToolDtoType = CallToolDto;
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    // Check if this is a dynamic entity DTO
    if (metadata.metatype && this.dynamicEntityTypes.has(metadata.metatype as Type<unknown>)) {
      // For dynamic entity DTOs, skip validation and just return the value
      return value;
    }

    // Check if this is CallToolDto by metatype
    if (metadata.metatype && metadata.metatype === this.callToolDtoType) {
      // For CallToolDto, skip validation completely to allow dynamic properties in arguments
      // eslint-disable-next-line no-console
      console.log('[SmartValidationPipe] Detected CallToolDto by metatype, skipping validation');
      return value;
    }

    // Fallback: Check if this is CallToolDto by structure (for cases where metatype is not available)
    if (
      value &&
      typeof value === 'object' &&
      'name' in value &&
      'arguments' in value &&
      typeof (value as { name: unknown }).name === 'string' &&
      typeof (value as { arguments: unknown }).arguments === 'object'
    ) {
      // This looks like CallToolDto - skip validation to allow dynamic properties
      // eslint-disable-next-line no-console
      console.log('[SmartValidationPipe] Detected CallToolDto by structure, skipping validation');
      return value;
    }

    // For other DTOs, use standard validation
    return this.validationPipe.transform(value, metadata);
  }
}
