import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateEntityDto, UpdateEntityDto } from '../dto/entity.dto';

@Injectable()
export class DynamicEntityValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Check if this is CreateEntityDto or UpdateEntityDto
    const isDynamicEntityDto = metatype === CreateEntityDto || metatype === UpdateEntityDto;

    if (isDynamicEntityDto) {
      // For dynamic entity DTOs, allow all properties
      // Just transform the object
      const object = plainToInstance(metatype, value);
      return object;
    }

    // For other DTOs, use standard validation
    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = this.flattenValidationErrors(errors);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((message) => {
          messages.push(message);
        });
      }
      if (error.children && error.children.length > 0) {
        messages.push(...this.flattenValidationErrors(error.children));
      }
    });
    return messages;
  }
}
