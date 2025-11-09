import type { TenantContext, BaseDocument } from '@crm-atlas/core';
export declare class EntityRepository {
  create<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    data: Omit<T, keyof BaseDocument>
  ): Promise<T>;
  findById<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    id: string
  ): Promise<T | null>;
  update<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    id: string,
    data: Partial<Omit<T, keyof BaseDocument | '_id'>>
  ): Promise<T | null>;
  delete(ctx: TenantContext, entity: string, id: string): Promise<boolean>;
  find<T extends BaseDocument>(
    ctx: TenantContext,
    entity: string,
    filter?: Record<string, unknown>
  ): Promise<T[]>;
}
//# sourceMappingURL=repository.d.ts.map
