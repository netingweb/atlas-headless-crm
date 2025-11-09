import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from './stores/auth-store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EntityList from './pages/EntityList';
import EntityDetail from './pages/EntityDetail';
import Settings from './pages/Settings';
import MainLayout from './components/layout/MainLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const storedToken = localStorage.getItem('auth_token');

  // Allow access if token exists in state or localStorage
  if (token || storedToken) {
    return <>{children}</>;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="entities/:entityType" element={<EntityList />} />
            <Route path="entities/:entityType/:id" element={<EntityDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
