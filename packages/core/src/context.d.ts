export interface TenantContext {
  tenant_id: string;
  unit_id: string;
  app_id?: string;
}
export interface Ownership {
  owner_unit: string;
  visible_to?: string[];
}
export interface BaseDocument {
  _id?: string;
  tenant_id: string;
  unit_id: string;
  app_id?: string;
  ownership: Ownership;
  visible_to?: string[];
  created_at: Date;
  updated_at: Date;
}
//# sourceMappingURL=context.d.ts.map
