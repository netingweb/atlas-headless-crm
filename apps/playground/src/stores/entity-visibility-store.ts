import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FieldVisibility, EntityVisibility } from '@/lib/api/playground-settings';

interface EntityVisibilityState {
  entityVisibility: Record<string, EntityVisibility>;
  isLoading: boolean;
  lastLoadedTenantUnit?: string; // Track which tenant/unit was last loaded
  setEntityVisibility: (entityVisibility: Record<string, EntityVisibility>) => void;
  getEntityVisibility: (entityName: string) => EntityVisibility | undefined;
  getFieldVisibility: (entityName: string, fieldName: string) => FieldVisibility | undefined;
  isEntityVisibleInMenu: (entityName: string) => boolean;
  isFieldVisibleInList: (entityName: string, fieldName: string) => boolean;
  isFieldVisibleInDetail: (entityName: string, fieldName: string) => boolean;
  isFieldVisibleInReference: (entityName: string, fieldName: string) => boolean;
  setLoading: (loading: boolean) => void;
  clearForTenantUnit: (tenantId: string, unitId: string) => void;
}

const STORAGE_KEY = 'entity-visibility-store';

export const useEntityVisibilityStore = create<EntityVisibilityState>()(
  persist(
    (set, get) => ({
      entityVisibility: {},
      isLoading: false,
      lastLoadedTenantUnit: undefined,

      setEntityVisibility: (entityVisibility) => {
        set({ entityVisibility });
      },

      clearForTenantUnit: (tenantId: string, unitId: string) => {
        const key = `${tenantId}:${unitId}`;
        const currentKey = get().lastLoadedTenantUnit;
        // Only clear if switching to a different tenant/unit
        if (currentKey && currentKey !== key) {
          set({ entityVisibility: {}, lastLoadedTenantUnit: key });
        } else if (!currentKey) {
          set({ lastLoadedTenantUnit: key });
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      getEntityVisibility: (entityName: string) => {
        return get().entityVisibility[entityName];
      },

      getFieldVisibility: (entityName: string, fieldName: string) => {
        const entity = get().entityVisibility[entityName];
        return entity?.fields[fieldName];
      },

      isEntityVisibleInMenu: (entityName: string) => {
        const entity = get().entityVisibility[entityName];
        // Default to true if not configured (backward compatibility)
        return entity?.visibleInMenu ?? true;
      },

      isFieldVisibleInList: (entityName: string, fieldName: string) => {
        const field = get().getFieldVisibility(entityName, fieldName);
        // Default to true if not configured (backward compatibility)
        return field?.visibleInList ?? true;
      },

      isFieldVisibleInDetail: (entityName: string, fieldName: string) => {
        const field = get().getFieldVisibility(entityName, fieldName);
        // Default to true if not configured (backward compatibility)
        return field?.visibleInDetail ?? true;
      },

      isFieldVisibleInReference: (entityName: string, fieldName: string) => {
        const field = get().getFieldVisibility(entityName, fieldName);
        // Default to true if not configured (backward compatibility)
        return field?.visibleInReference ?? true;
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist entityVisibility, not loading state
      partialize: (state) => ({
        entityVisibility: state.entityVisibility,
        lastLoadedTenantUnit: state.lastLoadedTenantUnit,
      }),
    }
  )
);
