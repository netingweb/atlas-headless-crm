import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { indexingApi, type TypesenseHealth, type TypesenseMetrics } from '@/lib/api/indexing';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Database, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

export default function IndexingTab() {
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ctx = tenantId && unitId ? { tenant_id: tenantId, unit_id: unitId } : null;

  // Health check query
  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery<TypesenseHealth>({
    queryKey: ['indexing', 'health', tenantId, unitId],
    queryFn: () => (ctx ? indexingApi.checkHealth(ctx) : Promise.reject('No context')),
    enabled: !!ctx,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Metrics query
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery<TypesenseMetrics>({
    queryKey: ['indexing', 'metrics', tenantId, unitId],
    queryFn: () => (ctx ? indexingApi.getMetrics(ctx) : Promise.reject('No context')),
    enabled: !!ctx,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Backfill mutation
  const backfillMutation = useMutation({
    mutationFn: () => (ctx ? indexingApi.triggerBackfill(ctx) : Promise.reject('No context')),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Backfill completed',
          description: data.message,
        });
        // Refetch metrics after backfill
        queryClient.invalidateQueries({ queryKey: ['indexing', 'metrics'] });
      } else {
        toast({
          title: 'Backfill failed',
          description: data.message,
          variant: 'destructive',
          action: (
            <ToastAction
              altText="Copy error message"
              onClick={() => {
                navigator.clipboard.writeText(data.message).then(() => {
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
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to trigger backfill';
      toast({
        title: 'Backfill error',
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
    },
  });

  const handleBackfill = () => {
    if (!ctx) return;
    if (confirm('Are you sure you want to trigger a full backfill? This may take some time.')) {
      backfillMutation.mutate();
    }
  };

  const refreshAll = () => {
    refetchHealth();
    refetchMetrics();
  };

  return (
    <div className="space-y-4">
      {/* Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Typesense Health</CardTitle>
              <CardDescription>Server health and connection status</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={healthLoading}
            >
              {healthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Checking health...</span>
            </div>
          ) : health ? (
            <div className="flex items-center gap-3">
              {health.ok ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">Healthy</p>
                    {health.version && (
                      <p className="text-sm text-gray-500">Version: {health.version}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-700">Unhealthy</p>
                    {health.error && <p className="text-sm text-red-500">{health.error}</p>}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to check health</p>
          )}
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Indexing Metrics</CardTitle>
              <CardDescription>Statistics about indexed collections and documents</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMetrics()}
              disabled={metricsLoading}
            >
              {metricsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Loading metrics...</span>
            </div>
          ) : metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{metrics.collections}</p>
                      <p className="text-sm text-gray-500">Collections</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{metrics.documents.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Documents</p>
                    </div>
                  </div>
                </div>
              </div>

              {metrics.collectionStats && metrics.collectionStats.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Collection Details</h3>
                  <div className="space-y-2">
                    {metrics.collectionStats.map((stat) => (
                      <div key={stat.name} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{stat.name}</p>
                            <p className="text-gray-500">
                              {stat.numDocuments.toLocaleString()} documents
                            </p>
                          </div>
                          <div className="text-right text-xs text-gray-400">
                            {stat.createdAt && (
                              <p>Created: {formatDate(new Date(stat.createdAt * 1000))}</p>
                            )}
                            {stat.updatedAt && (
                              <p>Updated: {formatDate(new Date(stat.updatedAt * 1000))}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to load metrics</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manual indexing operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackfill}
              disabled={backfillMutation.isPending || !ctx}
              variant="default"
            >
              {backfillMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Trigger Full Backfill
                </>
              )}
            </Button>
            <Button
              onClick={refreshAll}
              disabled={healthLoading || metricsLoading}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Trigger a full backfill to re-index all entities from MongoDB to Typesense and Qdrant.
            This operation may take several minutes depending on the amount of data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
