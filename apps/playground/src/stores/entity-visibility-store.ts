import { create } from 'zustand';
import type { FieldVisibility, EntityVisibility } from '@/lib/api/playground-settings';

interface EntityVisibilityState {
  entityVisibility: Record<string, EntityVisibility>;
  isLoading: boolean;
  setEntityVisibility: (entityVisibility: Record<string, EntityVisibility>) => void;
  getEntityVisibility: (entityName: string) => EntityVisibility | undefined;
  getFieldVisibility: (entityName: string, fieldName: string) => FieldVisibility | undefined;
  isEntityVisibleInMenu: (entityName: string) => boolean;
  isFieldVisibleInList: (entityName: string, fieldName: string) => boolean;
  isFieldVisibleInDetail: (entityName: string, fieldName: string) => boolean;
  isFieldVisibleInReference: (entityName: string, fieldName: string) => boolean;
  setLoading: (loading: boolean) => void;
}

export const useEntityVisibilityStore = create<EntityVisibilityState>((set, get) => ({
  entityVisibility: {},
  isLoading: false,

  setEntityVisibility: (entityVisibility) => {
    set({ entityVisibility });
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
}));
