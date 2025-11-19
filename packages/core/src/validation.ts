import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { EntityDefinition, FieldDefinition } from '@crm-atlas/types';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export class ValidatorCache {
  private cache = new Map<string, ValidateFunction>();
  private updateCache = new Map<string, ValidateFunction>();

  getOrCompile(
    tenantId: string,
    entityName: string,
    entityDef: EntityDefinition
  ): ValidateFunction {
    const key = `${tenantId}:${entityName}`;
    let validator = this.cache.get(key);

    if (!validator) {
      const schema = this.buildJsonSchema(entityDef);
      validator = ajv.compile(schema);
      this.cache.set(key, validator);
    }

    return validator;
  }

  getOrCompileForUpdate(
    tenantId: string,
    entityName: string,
    schema: Record<string, unknown>
  ): ValidateFunction {
    const key = `${tenantId}:${entityName}:update`;
    let validator = this.updateCache.get(key);

    if (!validator) {
      validator = ajv.compile(schema);
      this.updateCache.set(key, validator);
    }

    return validator;
  }

  private buildJsonSchema(entityDef: EntityDefinition): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const field of entityDef.fields) {
      properties[field.name] = this.fieldToJsonSchema(field);
      if (field.required) {
        required.push(field.name);
      }
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: true, // Allow additional properties for system fields (_id, tenant_id, etc.)
    };
  }

  private fieldToJsonSchema(field: FieldDefinition): Record<string, unknown> {
    const schema: Record<string, unknown> = {};

    switch (field.type) {
      case 'string':
      case 'email':
      case 'url':
      case 'text':
        schema.type = 'string';
        if (field.type === 'email') {
          schema.format = 'email';
        } else if (field.type === 'url') {
          schema.format = 'uri';
        }
        break;
      case 'number':
        schema.type = 'number';
        break;
      case 'boolean':
        schema.type = 'boolean';
        break;
      case 'date':
        schema.type = 'string';
        // Use pattern to validate YYYY-MM-DD format (ISO date)
        schema.pattern = '^\\d{4}-\\d{2}-\\d{2}$';
        break;
      case 'datetime':
        schema.type = 'string';
        // Use date-time format to validate ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss)
        schema.format = 'date-time';
        break;
      case 'json':
        schema.type = 'object';
        break;
      case 'reference':
        schema.type = 'string';
        break;
    }

    if (field.default !== undefined) {
      schema.default = field.default;
    }

    if (field.validation) {
      Object.assign(schema, field.validation);
    }

    return schema;
  }

  clear(tenantId?: string): void {
    if (tenantId) {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
      // Also clear update cache for this tenant
      const updateKeysToDelete: string[] = [];
      for (const key of this.updateCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          updateKeysToDelete.push(key);
        }
      }
      for (const key of updateKeysToDelete) {
        this.updateCache.delete(key);
      }
    } else {
      this.cache.clear();
      this.updateCache.clear();
    }
  }
}
