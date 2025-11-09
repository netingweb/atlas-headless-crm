import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  aiDrawerOpen: boolean;
  toggleSidebar: () => void;
  toggleAIDrawer: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAIDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  aiDrawerOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleAIDrawer: () => set((state) => ({ aiDrawerOpen: !state.aiDrawerOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setAIDrawerOpen: (open) => set({ aiDrawerOpen: open }),
}));
