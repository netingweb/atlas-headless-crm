import { PipeTransform, Injectable, ArgumentMetadata, Type } from '@nestjs/common';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { CreateEntityDto, UpdateEntityDto } from '../dto/entity.dto';

@Injectable()
export class SmartValidationPipe implements PipeTransform<any> {
  private readonly validationPipe: ValidationPipe;
  private readonly dynamicEntityTypes: Set<Type<any>>;

  constructor(options?: ValidationPipeOptions) {
    this.validationPipe = new ValidationPipe(options);
    // Store references to dynamic entity DTO types
    this.dynamicEntityTypes = new Set([CreateEntityDto, UpdateEntityDto]);
  }

  async transform(value: any, metadata: ArgumentMetadata) {
    // Check if this is a dynamic entity DTO
    if (metadata.metatype && this.dynamicEntityTypes.has(metadata.metatype)) {
      // For dynamic entity DTOs, skip validation and just return the value
      return value;
    }

    // For other DTOs, use standard validation
    return this.validationPipe.transform(value, metadata);
  }
}
