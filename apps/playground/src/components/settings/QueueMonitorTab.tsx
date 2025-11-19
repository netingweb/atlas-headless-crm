import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { documentsApi } from '@/lib/api/documents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function QueueMonitorTab() {
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['queue-stats', tenantId, unitId],
    queryFn: () => documentsApi.getQueueStats(tenantId || '', unitId || ''),
    enabled: !!tenantId && !!unitId,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time monitoring
  });

  const { data: failedJobs, isLoading: isLoadingFailed } = useQuery({
    queryKey: ['failed-jobs', tenantId, unitId],
    queryFn: () => documentsApi.getFailedJobs(tenantId || '', unitId || '', 50),
    enabled: !!tenantId && !!unitId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: allJobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['queue-jobs', tenantId, unitId],
    queryFn: () =>
      documentsApi.getQueueJobs(tenantId || '', unitId || '', ['waiting', 'active', 'failed'], 100),
    enabled: !!tenantId && !!unitId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const cleanQueueMutation = useMutation({
    mutationFn: (grace?: number) => documentsApi.cleanQueue(tenantId || '', unitId || '', grace),
    onSuccess: (result) => {
      toast({
        title: 'Queue cleaned',
        description: `Removed ${result.completed} completed and ${result.failed} failed jobs`,
      });
      queryClient.invalidateQueries({ queryKey: ['queue-stats', tenantId, unitId] });
      queryClient.invalidateQueries({ queryKey: ['failed-jobs', tenantId, unitId] });
      queryClient.invalidateQueries({ queryKey: ['queue-jobs', tenantId, unitId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to clean queue',
        description: error?.response?.data?.message || error?.message || 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            <span className="text-gray-500">Loading queue statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>
              Error loading queue statistics: {(error as Error).message || 'Unknown error'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalJobs =
    (stats?.waiting || 0) +
    (stats?.active || 0) +
    (stats?.completed || 0) +
    (stats?.failed || 0) +
    (stats?.delayed || 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Processing Queue</CardTitle>
              <CardDescription>
                Real-time monitoring of document processing jobs. Statistics refresh automatically
                every 5 seconds.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              {(stats?.completed || 0) > 0 || (stats?.failed || 0) > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cleanQueueMutation.mutate(0)}
                  disabled={cleanQueueMutation.isPending}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  {cleanQueueMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Clean All
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Waiting Jobs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Waiting</span>
              </div>
              <div className="text-3xl font-bold text-yellow-600">{stats?.waiting || 0}</div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Queued
              </Badge>
            </div>

            {/* Active Jobs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{stats?.active || 0}</div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Processing
              </Badge>
            </div>

            {/* Completed Jobs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Completed</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{stats?.completed || 0}</div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Success
              </Badge>
            </div>

            {/* Failed Jobs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Failed</span>
              </div>
              <div className="text-3xl font-bold text-red-600">{stats?.failed || 0}</div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Errors
              </Badge>
            </div>

            {/* Delayed Jobs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Delayed</span>
              </div>
              <div className="text-3xl font-bold text-orange-600">{stats?.delayed || 0}</div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Scheduled
              </Badge>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Jobs Processed</p>
                <p className="text-2xl font-bold text-gray-900">{totalJobs}</p>
              </div>
              {stats && totalJobs > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {((stats.completed / totalJobs) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div
              className={`h-2 w-2 rounded-full ${(stats?.active || 0) > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
            />
            <span className="text-gray-600">
              {(stats?.active || 0) > 0
                ? 'Queue is processing documents'
                : (stats?.waiting || 0) > 0
                  ? 'Queue has pending jobs'
                  : 'Queue is idle'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Failed Jobs Details */}
      {(stats?.failed || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Failed Jobs Details</CardTitle>
            <CardDescription>
              {failedJobs?.length || 0} failed job(s). Click to expand and see error details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingFailed ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-gray-500">Loading failed jobs...</span>
              </div>
            ) : failedJobs && failedJobs.length > 0 ? (
              <div className="space-y-2">
                {failedJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="font-medium">Job {job.id}</span>
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Failed
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>
                            <strong>Document ID:</strong> {(job.data as any)?.documentId || 'N/A'}
                          </p>
                          <p>
                            <strong>Failed at:</strong> {formatTimestamp(job.finishedOn)}
                          </p>
                          <p>
                            <strong>Attempts:</strong> {job.attemptsMade || 0}
                          </p>
                        </div>
                        {job.failedReason && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-red-700">Error:</p>
                            <p className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded mt-1">
                              {job.failedReason}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        {expandedJobId === job.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {expandedJobId === job.id && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Job Data:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(job.data, null, 2)}
                          </pre>
                        </div>
                        {job.stacktrace && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Stack Trace:</p>
                            <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-60 font-mono text-red-800">
                              {job.stacktrace}
                            </pre>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          <p>
                            <strong>Created:</strong> {formatTimestamp(job.timestamp)}
                          </p>
                          {job.processedOn && (
                            <p>
                              <strong>Processed:</strong> {formatTimestamp(job.processedOn)}
                            </p>
                          )}
                          <p>
                            <strong>Finished:</strong> {formatTimestamp(job.finishedOn)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No failed jobs found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Jobs */}
      {(stats?.active || 0) > 0 && allJobs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Jobs</CardTitle>
            <CardDescription>Jobs currently being processed</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingJobs ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-gray-500">Loading active jobs...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {allJobs
                  .filter((job: any) => job.state === 'active')
                  .map((job: any) => (
                    <div key={job.id} className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="font-medium text-sm">Job {job.id}</span>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Processing
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Document ID: {(job.data as any)?.documentId || 'N/A'}
                      </p>
                      {job.progress && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{job.progress}% complete</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Waiting:</strong> Documents queued and waiting to be processed
            </p>
            <p>
              <strong>Active:</strong> Documents currently being processed (content extraction,
              embedding, indexing)
            </p>
            <p>
              <strong>Completed:</strong> Documents successfully processed and indexed
            </p>
            <p>
              <strong>Failed:</strong> Documents that encountered errors during processing. Click on
              failed jobs above to see detailed error messages and stack traces.
            </p>
            <p>
              <strong>Delayed:</strong> Documents scheduled for processing at a later time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
