import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Info, Copy } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: 'demo',
    email: 'admin@demo.local',
    password: 'changeme',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      // Set token first
      setToken(response.token);

      // Pass token directly to getMe to avoid timing issues
      const user = await authApi.getMe(response.token);
      setUser(user);
      toast({
        title: 'Login successful',
        description: 'Welcome to Atlas CRM Headless Playground',
      });
      navigate('/');
    } catch (error: unknown) {
      console.error('Login error:', error);
      let errorMessage = 'Invalid credentials';

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } }; message?: string };
        if (!apiError.response) {
          // Network error
          errorMessage =
            'Network error: Unable to connect to the API server. Please ensure the API is running on http://localhost:3000';
        } else if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error message"
            onClick={() => {
              navigator.clipboard.writeText(errorMessage).then(() => {
                toast({
                  title: 'Copied',
                  description: 'Error message copied to clipboard',
                });
              });
            }}
          >
            <Copy className="h-4 w-4" />
          </ToastAction>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Atlas CRM Headless Playground</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant ID</Label>
              <Input
                id="tenant_id"
                value={formData.tenant_id}
                onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Test Users Info */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Test Users</h4>
                <div className="space-y-1.5 text-xs text-blue-800">
                  <div>
                    <strong>Admin:</strong> admin@demo.local / changeme
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-200 rounded text-blue-900">
                      Full Access
                    </span>
                  </div>
                  <div>
                    <strong>Manager:</strong> manager@demo.local / password123
                    <span className="ml-2 px-1.5 py-0.5 bg-green-200 rounded text-green-900">
                      Read + Write
                    </span>
                  </div>
                  <div>
                    <strong>Sales Rep:</strong> rep@demo.local / password123
                    <span className="ml-2 px-1.5 py-0.5 bg-gray-200 rounded text-gray-900">
                      Read Only
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
