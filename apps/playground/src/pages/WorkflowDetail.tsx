import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { workflowsApi } from '@/lib/api/workflows';
import type { WorkflowDefinition } from '@crm-atlas/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Copy, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { WorkflowExecutionLog } from '@crm-atlas/types';

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [formData, setFormData] = useState<Partial<WorkflowDefinition>>({
    workflow_id: '',
    name: '',
    type: 'event',
    enabled: true,
    status: 'active',
    trigger: {
      type: 'event',
      event: 'entity.updated',
    },
    actions: [],
  });

  const [jsonView, setJsonView] = useState<string>('');
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [executeContext, setExecuteContext] = useState<string>('{}');
  const [executeActor, setExecuteActor] = useState<string>('');

  // Get workflow data
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', tenantId, unitId, id],
    queryFn: () => workflowsApi.get(tenantId || '', unitId || '', id || ''),
    enabled: !!tenantId && !!unitId && !!id && !isNew,
  });

  // Get workflow executions
  const { data: executions, isLoading: isLoadingExecutions } = useQuery<WorkflowExecutionLog[]>({
    queryKey: ['workflow-executions', tenantId, unitId, id],
    queryFn: () => workflowsApi.getExecutions(tenantId || '', unitId || '', id || '', 100, 0),
    enabled: !!tenantId && !!unitId && !!id && !isNew,
  });

  // Initialize form data
  useEffect(() => {
    if (isNew) {
      setFormData({
        name: '',
        type: 'event',
        enabled: true,
        status: 'active',
        trigger: {
          type: 'event',
          event: 'entity.updated',
        },
        actions: [],
      });
    } else if (workflow) {
      setFormData(workflow);
    }
  }, [workflow, isNew]);

  // Update JSON view when form data changes
  useEffect(() => {
    setJsonView(JSON.stringify(formData, null, 2));
  }, [formData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<WorkflowDefinition, 'tenant_id' | 'created_at' | 'updated_at'>) =>
      workflowsApi.create(tenantId || '', unitId || '', data),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Workflow created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['workflows', tenantId, unitId] });
      navigate(`/workflows/${data.workflow_id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to create workflow',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (
      updates: Partial<Omit<WorkflowDefinition, 'workflow_id' | 'tenant_id' | 'created_at'>>
    ) => workflowsApi.update(tenantId || '', unitId || '', id || '', updates),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Workflow updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['workflows', tenantId, unitId] });
      queryClient.invalidateQueries({ queryKey: ['workflow', tenantId, unitId, id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update workflow',
        variant: 'destructive',
      });
    },
  });

  // Trigger workflow mutation
  const triggerMutation = useMutation({
    mutationFn: (data: { context?: Record<string, unknown>; actor?: string }) =>
      workflowsApi.trigger(tenantId || '', unitId || '', id || '', data.context, data.actor),
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Workflow triggered successfully. Execution ID: ${data.execution_id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', tenantId, unitId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-executions', tenantId, unitId, id] });
      queryClient.invalidateQueries({ queryKey: ['workflows', tenantId, unitId] });
      setShowExecuteDialog(false);
      setExecuteContext('{}');
      setExecuteActor('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to trigger workflow',
        variant: 'destructive',
      });
    },
  });

  const handleExecute = () => {
    if (!id || id === 'new') {
      toast({
        title: 'Error',
        description: 'Please save the workflow before executing it',
        variant: 'destructive',
      });
      return;
    }

    try {
      const context = executeContext.trim() ? JSON.parse(executeContext) : undefined;
      const actor = executeActor.trim() || undefined;
      triggerMutation.mutate({ context, actor });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid JSON in context field',
        variant: 'destructive',
      });
    }
  };

  const handleSave = () => {
    if (isNew) {
      if (!formData.name || !formData.trigger || !formData.actions) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields (name, trigger, actions)',
          variant: 'destructive',
        });
        return;
      }
      // Remove workflow_id, tenant_id, created_at, updated_at from form data
      // They will be generated/set by the server
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { workflow_id, tenant_id, created_at, updated_at, ...createData } = formData;
      createMutation.mutate(
        createData as Omit<WorkflowDefinition, 'tenant_id' | 'created_at' | 'updated_at'>
      );
    } else {
      updateMutation.mutate(formData);
    }
  };

  const handleJsonChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setFormData(parsed);
      setJsonView(value);
    } catch (error) {
      // Invalid JSON, just update the view
      setJsonView(value);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonView);
    toast({
      title: 'Copied',
      description: 'Workflow JSON copied to clipboard',
    });
  };

  if (isLoading && !isNew) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'Create Workflow' : formData.name || 'Workflow'}
            </h1>
            <p className="text-gray-500">
              {isNew ? 'Create a new workflow automation' : 'Edit workflow configuration'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => setShowExecuteDialog(true)}
              disabled={triggerMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Execute Now
            </Button>
          )}
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy JSON
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="form" className="w-full">
        <TabsList>
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          {!isNew && <TabsTrigger value="executions">Executions</TabsTrigger>}
        </TabsList>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Workflow identification and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isNew && (
                <div className="space-y-2">
                  <Label htmlFor="workflow_id">Workflow ID</Label>
                  <Input
                    id="workflow_id"
                    value={formData.workflow_id || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">
                    Workflow ID is auto-generated and cannot be changed
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Follow up hot lead"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type || 'event'}
                    onValueChange={(value: 'event' | 'schedule' | 'manual') =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'active'}
                    onValueChange={(value: 'active' | 'inactive' | 'draft') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled || false}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trigger Configuration</CardTitle>
              <CardDescription>Define when the workflow should execute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger JSON</Label>
                <Textarea
                  value={JSON.stringify(formData.trigger || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, trigger: parsed });
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Edit the trigger configuration as JSON. See documentation for trigger types.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Actions to execute when workflow triggers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Actions JSON</Label>
                <Textarea
                  value={JSON.stringify(formData.actions || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, actions: parsed });
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Edit the actions array as JSON. See documentation for action types.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow JSON</CardTitle>
              <CardDescription>Complete workflow definition in JSON format</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jsonView}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={30}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {!isNew && (
          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution History</CardTitle>
                <CardDescription>View all execution logs for this workflow</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingExecutions ? (
                  <div className="text-center py-8 text-gray-500">Loading executions...</div>
                ) : executions && executions.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Execution ID
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
                            Completed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {executions.map((execution) => (
                          <tr key={execution.log_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                              {execution.log_id.substring(0, 8)}...
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
                              {execution.completed_at
                                ? format(new Date(execution.completed_at), 'PPp')
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {execution.duration_ms
                                ? `${(execution.duration_ms / 1000).toFixed(2)}s`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No executions found for this workflow
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Execute Dialog */}
      {showExecuteDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowExecuteDialog(false);
            setExecuteContext('{}');
            setExecuteActor('');
          }}
        >
          <Card className="w-full max-w-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Execute Workflow</CardTitle>
              <CardDescription>
                Trigger this workflow manually with custom context data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="execute-context">Context (JSON)</Label>
                <Textarea
                  id="execute-context"
                  value={executeContext}
                  onChange={(e) => setExecuteContext(e.target.value)}
                  placeholder='{"entity_id": "123", "entity": {"name": "Test"}}'
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Optional: Provide context data as JSON. This will be available as{' '}
                  <code>context</code> in workflow actions.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="execute-actor">Actor (Optional)</Label>
                <Input
                  id="execute-actor"
                  value={executeActor}
                  onChange={(e) => setExecuteActor(e.target.value)}
                  placeholder="user_123 or admin@demo.local"
                />
                <p className="text-sm text-gray-500">
                  Optional: User ID or email of the person triggering this workflow
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExecuteDialog(false);
                    setExecuteContext('{}');
                    setExecuteActor('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleExecute} disabled={triggerMutation.isPending}>
                  {triggerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
