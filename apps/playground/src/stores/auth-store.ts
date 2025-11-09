import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type User } from '../lib/api/auth';

interface AuthState {
  token: string | null;
  user: User | null;
  tenantId: string | null;
  unitId: string | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      tenantId: null,
      unitId: null,

      setToken: (token: string) => {
        localStorage.setItem('auth_token', token);
        set({ token });
      },

      setUser: (user: User) => {
        set({
          user,
          tenantId: user.tenant_id,
          unitId: user.unit_id,
        });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          token: null,
          user: null,
          tenantId: null,
          unitId: null,
        });
      },

      loadUser: async () => {
        const token = get().token || localStorage.getItem('auth_token');
        if (!token) {
          return;
        }
        try {
          const user = await authApi.getMe();
          get().setUser(user);
        } catch (error) {
          console.error('Failed to load user:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        tenantId: state.tenantId,
        unitId: state.unitId,
      }),
      onRehydrateStorage: () => (state) => {
        // When rehydrating, ensure token is synced with localStorage
        if (state?.token) {
          localStorage.setItem('auth_token', state.token);
        }
      },
    }
  )
);
