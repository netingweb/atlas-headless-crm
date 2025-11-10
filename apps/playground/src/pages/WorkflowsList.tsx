import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { workflowsApi } from '@/lib/api/workflows';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Play, Pause, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

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

  const { data: executions } = useQuery({
    queryKey: ['workflow-executions', tenantId, unitId],
    queryFn: () => workflowsApi.getAllExecutions(tenantId || '', unitId || '', 100, 0),
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
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workflow',
        variant: 'destructive',
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
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workflow status',
        variant: 'destructive',
      });
    },
  });

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

  const getLastExecution = (workflowId: string) => {
    if (!executions) return null;
    const workflowExecutions = executions.filter((e) => e.workflow_id === workflowId);
    if (workflowExecutions.length === 0) return null;
    return workflowExecutions.sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];
  };

  const getStatusBadge = (workflow: any) => {
    if (!workflow.enabled || workflow.status !== 'active') {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (isLoading) {
    return <div>Loading...</div>;
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
                          {lastExecution
                            ? format(new Date(lastExecution.started_at), 'PPp')
                            : 'Never'}
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
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No workflows found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
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
                        {execution.workflow_id}
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
