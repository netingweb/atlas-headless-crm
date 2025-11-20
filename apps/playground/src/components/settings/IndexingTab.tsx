import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  indexingApi,
  type TypesenseHealth,
  type IndexingMetricsResponse,
} from '@/lib/api/indexing';
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
  } = useQuery<IndexingMetricsResponse>({
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

  const handleCopyMetrics = () => {
    if (!metrics) return;
    navigator.clipboard.writeText(JSON.stringify(metrics, null, 2)).then(() => {
      toast({
        title: 'Copied',
        description: 'Indexing data copied to clipboard',
      });
    });
  };

  const renderCollectionSection = (
    title: string,
    items: IndexingMetricsResponse['globalCollections'],
    emptyMessage: string
  ) => {
    if (!items.length) {
      return <p className="text-sm text-gray-500">{emptyMessage}</p>;
    }

    const indexedCount = items.filter((item) => item.indexed).length;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs text-gray-500">
            {indexedCount}/{items.length} indexed
          </span>
        </div>
        <div className="space-y-2">
          {items.map((stat) => (
            <div key={`${stat.name}-${stat.unit_id || 'global'}`} className="rounded-lg border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-blue-600">
                      {stat.numDocuments.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 text-center">documents</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {stat.entity || stat.name}{' '}
                      {stat.unit_id && (
                        <span className="text-xs text-gray-500">({stat.unit_id})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{stat.name}</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                      stat.indexed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {stat.indexed ? 'Indexed' : 'Missing'}
                  </div>
                  {stat.createdAt ? (
                    <p className="mt-1 text-gray-400">
                      Created: {formatDate(new Date(stat.createdAt * 1000))}
                    </p>
                  ) : null}
                  {stat.updatedAt ? (
                    <p className="text-gray-400">
                      Updated: {formatDate(new Date(stat.updatedAt * 1000))}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyMetrics} disabled={!metrics}>
                <Copy className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Copy data</span>
              </Button>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics.summary.totalCollections.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Collections</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics.summary.totalDocuments.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Documents</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics.summary.global.indexed}/{metrics.summary.global.expected}
                      </p>
                      <p className="text-sm text-gray-500">
                        Global collections ({metrics.summary.global.documents.toLocaleString()}{' '}
                        docs)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics.summary.local.indexed}/{metrics.summary.local.expected}
                      </p>
                      <p className="text-sm text-gray-500">
                        Local collections ({metrics.summary.local.documents.toLocaleString()} docs)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {renderCollectionSection(
                  'Global Collections',
                  metrics.globalCollections,
                  'No global collections configured for this tenant.'
                )}
                {renderCollectionSection(
                  'Local Collections',
                  metrics.localCollections,
                  'No local collections configured for this tenant.'
                )}
                {metrics.unknownCollections.length > 0 &&
                  renderCollectionSection(
                    'Unknown Collections',
                    metrics.unknownCollections,
                    'No unexpected collections found.'
                  )}
              </div>
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
