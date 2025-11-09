import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import AIDrawer from './AIDrawer';
import { useUIStore } from '@/stores/ui-store';

export default function MainLayout() {
  const navigate = useNavigate();
  const { token, loadUser } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();

  useEffect(() => {
    const initAuth = async () => {
      // Check if we have a token in localStorage but not in state
      const storedToken = localStorage.getItem('auth_token');

      if (storedToken && !token) {
        // Token exists but state is not hydrated yet, wait a bit for zustand to hydrate
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const currentToken = token || localStorage.getItem('auth_token');

      if (currentToken) {
        try {
          await loadUser();
        } catch (error) {
          console.error('Failed to load user on mount:', error);
          // Only redirect if it's a real auth error, not a network error
          if ((error as any)?.response?.status === 401) {
            navigate('/login');
          }
        }
      }
    };

    initAuth();
  }, []); // Only run on mount

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <AIDrawer />
    </div>
  );
}
