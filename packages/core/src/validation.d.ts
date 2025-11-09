import { ValidateFunction } from 'ajv';
import type { EntityDefinition } from '@crm-atlas/types';
export declare class ValidatorCache {
  private cache;
  getOrCompile(tenantId: string, entityName: string, entityDef: EntityDefinition): ValidateFunction;
  private buildJsonSchema;
  private fieldToJsonSchema;
  clear(tenantId?: string): void;
}
//# sourceMappingURL=validation.d.ts.map
