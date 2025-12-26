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
      // Debug: log schema for service_order
      if (entityName === 'service_order' && schema.properties) {
        const properties = schema.properties as Record<string, unknown>;
        // eslint-disable-next-line no-console
        console.log(
          '[ValidatorCache] Building schema for service_order:',
          JSON.stringify(properties.service_type, null, 2)
        );
      }
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
    const baseSchema: Record<string, unknown> = {};

    switch (field.type) {
      case 'string':
      case 'email':
      case 'url':
      case 'text':
        baseSchema.type = 'string';
        if (field.type === 'email') {
          baseSchema.format = 'email';
        } else if (field.type === 'url') {
          baseSchema.format = 'uri';
        }
        break;
      case 'number':
        baseSchema.type = 'number';
        break;
      case 'boolean':
        baseSchema.type = 'boolean';
        break;
      case 'date':
        baseSchema.type = 'string';
        // Use pattern to validate YYYY-MM-DD format (ISO date)
        baseSchema.pattern = '^\\d{4}-\\d{2}-\\d{2}$';
        break;
      case 'datetime':
        baseSchema.type = 'string';
        // Use date-time format to validate ISO 8601 datetime format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ss)
        baseSchema.format = 'date-time';
        break;
      case 'json':
        baseSchema.type = 'object';
        break;
      case 'reference':
        baseSchema.type = 'string';
        break;
    }

    if (field.default !== undefined) {
      baseSchema.default = field.default;
    }

    if (field.validation) {
      Object.assign(baseSchema, field.validation);
    }

    if (field.label) {
      baseSchema.title = field.label;
    }

    if (field.multiple === true) {
      // Extract default and title separately, keep everything else (including enum) in itemSchema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { default: itemDefault, title: itemTitle, ...itemSchema } = baseSchema;
      const arraySchema: Record<string, unknown> = {
        type: 'array',
        items: Object.keys(itemSchema).length > 0 ? itemSchema : { type: 'string' },
      };

      if (itemDefault !== undefined) {
        arraySchema.default = itemDefault;
      }

      if (field.label) {
        arraySchema.title = field.label;
      }

      // Debug: log schema for multiple fields with enum
      if (field.name === 'service_type' && field.validation?.enum) {
        // eslint-disable-next-line no-console
        console.log(
          '[ValidatorCache] Generated schema for service_type:',
          JSON.stringify(arraySchema, null, 2)
        );
        // eslint-disable-next-line no-console
        console.log('[ValidatorCache] itemSchema:', JSON.stringify(itemSchema, null, 2));
      }

      return arraySchema;
    }

    return baseSchema;
  }

  clear(tenantId?: string): void {
    if (tenantId) {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          keysToDelete.push(key);
        }
      }
      // eslint-disable-next-line no-console
      console.log(
        `[ValidatorCache] Clearing cache for tenant ${tenantId}, found ${keysToDelete.length} keys:`,
        keysToDelete
      );
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
      // eslint-disable-next-line no-console
      console.log(`[ValidatorCache] Cache cleared for tenant ${tenantId}`);
    } else {
      this.cache.clear();
      this.updateCache.clear();
      // eslint-disable-next-line no-console
      console.log('[ValidatorCache] All cache cleared');
    }
  }
}
