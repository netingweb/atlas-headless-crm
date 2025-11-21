import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { workflowsApi } from '@/lib/api/workflows';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Play, Pause, Eye, Copy, Trash } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { WorkflowExecutionLog } from '@crm-atlas/types';

export default function WorkflowsList() {
  const navigate = useNavigate();
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows', tenantId, unitId],
    queryFn: () => workflowsApi.list(tenantId || '', unitId || ''),
    enabled: !!tenantId && !!unitId,
  });

  const { data: executions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: ['workflow-executions', tenantId, unitId],
    queryFn: () => workflowsApi.getAllExecutions(tenantId || '', unitId || '', 500, 0),
    enabled: !!tenantId && !!unitId,
  });

  const deleteMutation = useMutation({
    mutationFn: (workflowId: string) =>
      workflowsApi.delete(tenantId || '', unitId || '', workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', tenantId, unitId] });
      toast({
        title: 'Success',
        description: 'Workflow deleted successfully',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to delete workflow';
      toast({
        title: 'Error',
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

  const updateStatusMutation = useMutation({
    mutationFn: ({
      workflowId,
      status,
      enabled,
    }: {
      workflowId: string;
      status: 'active' | 'inactive' | 'draft';
      enabled?: boolean;
    }) => workflowsApi.updateStatus(tenantId || '', unitId || '', workflowId, status, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', tenantId, unitId] });
      toast({
        title: 'Success',
        description: 'Workflow status updated successfully',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to update workflow status';
      toast({
        title: 'Error',
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

  const deleteAllExecutionsMutation = useMutation({
    mutationFn: () => workflowsApi.deleteAllExecutions(tenantId || '', unitId || ''),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', tenantId, unitId] });
      queryClient.invalidateQueries({ queryKey: ['workflows', tenantId, unitId] });
      toast({
        title: 'Success',
        description: `Deleted ${data.deletedCount} execution log(s)`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to delete execution logs';
      toast({
        title: 'Error',
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

  const handleDeleteAllExecutions = () => {
    if (
      confirm('Are you sure you want to delete ALL execution logs? This action cannot be undone.')
    ) {
      deleteAllExecutionsMutation.mutate();
    }
  };

  const handleDelete = (workflowId: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      deleteMutation.mutate(workflowId);
    }
  };

  const handleActivate = (workflowId: string) => {
    updateStatusMutation.mutate({ workflowId, status: 'active', enabled: true });
  };

  const handleSuspend = (workflowId: string) => {
    updateStatusMutation.mutate({ workflowId, status: 'inactive', enabled: false });
  };

  // Create a map of workflow_id to last execution for efficient lookup
  const lastExecutionsMap = useMemo(() => {
    if (!executions || executions.length === 0) {
      return new Map<string, WorkflowExecutionLog>();
    }

    const map = new Map<string, WorkflowExecutionLog>();

    // Filter executions by unit_id if unitId is available
    const filteredExecutions = unitId
      ? executions.filter((e) => !e.unit_id || e.unit_id === unitId)
      : executions;

    filteredExecutions.forEach((execution) => {
      const workflowId = execution.workflow_id;
      if (!workflowId) {
        return;
      }

      const existing = map.get(workflowId);
      if (!existing) {
        map.set(workflowId, execution);
      } else {
        // Keep the most recent execution
        try {
          const existingDate = new Date(existing.started_at).getTime();
          const currentDate = new Date(execution.started_at).getTime();
          if (currentDate > existingDate) {
            map.set(workflowId, execution);
          }
        } catch (error) {
          // If date parsing fails, keep the existing one
          console.warn('Failed to parse execution date:', error);
        }
      }
    });

    return map;
  }, [executions, unitId]);

  const getLastExecution = (workflowId: string) => {
    return lastExecutionsMap.get(workflowId) || null;
  };

  const getStatusBadge = (workflow: any) => {
    if (!workflow.enabled || workflow.status !== 'active') {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (isLoading) {
    return <div>Loading workflows...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-gray-500">Manage your workflow automations</p>
        </div>
        <Button onClick={() => navigate('/workflows/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Workflow
        </Button>
      </div>

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="executions">Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Execution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {workflows && workflows.length > 0 ? (
                  workflows.map((workflow) => {
                    const lastExecution = getLastExecution(workflow.workflow_id);
                    return (
                      <tr key={workflow.workflow_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-blue-600 hover:underline font-mono"
                              onClick={() => navigate(`/workflows/${workflow.workflow_id}`)}
                            >
                              {workflow.workflow_id}
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100"
                              onClick={() => {
                                navigator.clipboard.writeText(workflow.workflow_id);
                                toast({
                                  title: 'Copied',
                                  description: 'Workflow ID copied to clipboard',
                                });
                              }}
                              aria-label="Copy workflow ID"
                            >
                              <Copy className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {workflow.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                          {workflow.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(workflow)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isLoadingExecutions ? (
                            <span className="text-gray-400">Loading...</span>
                          ) : lastExecution && lastExecution.started_at ? (
                            format(new Date(lastExecution.started_at), 'PPp')
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/workflows/${workflow.workflow_id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {workflow.enabled && workflow.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspend(workflow.workflow_id)}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivate(workflow.workflow_id)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(workflow.workflow_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No workflows found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Execution Logs</h2>
              <p className="text-sm text-gray-500">
                {executions ? `${executions.length} execution log(s)` : 'Loading...'}
              </p>
            </div>
            {executions && executions.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteAllExecutions}
                disabled={deleteAllExecutionsMutation.isPending}
              >
                <Trash className="h-4 w-4 mr-2" />
                {deleteAllExecutionsMutation.isPending ? 'Deleting...' : 'Delete All Logs'}
              </Button>
            )}
          </div>
          <div className="border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Workflow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trigger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {executions && executions.length > 0 ? (
                  executions.map((execution) => (
                    <tr key={execution.log_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          className="text-blue-600 hover:underline font-mono"
                          onClick={() => navigate(`/workflows/${execution.workflow_id}`)}
                        >
                          {execution.workflow_id}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                        {execution.trigger_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge
                          variant={
                            execution.status === 'completed'
                              ? 'default'
                              : execution.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {execution.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(execution.started_at), 'PPp')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {execution.duration_ms
                          ? `${(execution.duration_ms / 1000).toFixed(2)}s`
                          : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No executions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
