import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { configApi } from '@/lib/api/config';
import { useQueryClient } from '@tanstack/react-query';

export default function CacheTab() {
  const { tenantId } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleClearCache = async (): Promise<void> => {
    if (!tenantId) {
      toast({
        title: 'Missing tenant',
        description: 'Please login/select a tenant first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await configApi.clearCache(tenantId);
      // Invalidate cached queries related to config/entities so UI refetches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['config-entities', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['units', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['permissions', tenantId] }),
      ]);
      toast({
        title: 'Cache cleared',
        description: res?.message || 'Configuration cache cleared successfully.',
      });
    } catch (error: unknown) {
      console.error('Failed to clear cache:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        'Failed to clear configuration cache';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Configuration Cache</h2>
        <p className="text-gray-500">
          Clear the API configuration cache for the current tenant to force reload from database.
        </p>
      </div>
      <Button onClick={handleClearCache} disabled={loading}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {loading ? 'Clearing...' : 'Clear Config Cache'}
      </Button>
    </div>
  );
}
