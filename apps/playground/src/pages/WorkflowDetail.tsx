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
import {
  ArrowLeft,
  Save,
  Copy,
  Play,
  Loader2,
  TestTube,
  Clipboard,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
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
    } as WorkflowDefinition['trigger'],
    actions: [],
  });

  const [jsonView, setJsonView] = useState<string>('');
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [executeContext, setExecuteContext] = useState<string>('{}');
  const [executeActor, setExecuteActor] = useState<string>('');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testContext, setTestContext] = useState<string>('{}');
  const [testResult, setTestResult] = useState<unknown | null>(null);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());

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
        } as WorkflowDefinition['trigger'],
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
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create workflow';
      const errorDetails = error.response?.data?.errors || error.response?.data || error;
      const errorText =
        typeof errorDetails === 'string' ? errorMessage : JSON.stringify(errorDetails, null, 2);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error details"
            onClick={() => {
              navigator.clipboard.writeText(errorText).then(() => {
                toast({
                  title: 'Copied',
                  description: 'Error details copied to clipboard',
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
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to update workflow';
      const errorDetails = error.response?.data?.errors || error.response?.data || error;
      const errorText =
        typeof errorDetails === 'string' ? errorMessage : JSON.stringify(errorDetails, null, 2);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error details"
            onClick={() => {
              navigator.clipboard.writeText(errorText).then(() => {
                toast({
                  title: 'Copied',
                  description: 'Error details copied to clipboard',
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
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to trigger workflow';
      const errorDetails = error.response?.data?.errors || error.response?.data || error;
      const errorText =
        typeof errorDetails === 'string' ? errorMessage : JSON.stringify(errorDetails, null, 2);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error details"
            onClick={() => {
              navigator.clipboard.writeText(errorText).then(() => {
                toast({
                  title: 'Copied',
                  description: 'Error details copied to clipboard',
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

  // Test workflow mutation
  const testMutation = useMutation({
    mutationFn: (context?: Record<string, unknown>) =>
      workflowsApi.test(tenantId || '', unitId || '', id || '', context),
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to test workflow';
      const errorDetails = error.response?.data?.errors || error.response?.data || error;
      const errorText =
        typeof errorDetails === 'string' ? errorMessage : JSON.stringify(errorDetails, null, 2);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error details"
            onClick={() => {
              navigator.clipboard.writeText(errorText).then(() => {
                toast({
                  title: 'Copied',
                  description: 'Error details copied to clipboard',
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

  const handleExecute = () => {
    if (!id || id === 'new') {
      toast({
        title: 'Error',
        description: 'Please save the workflow before executing it',
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error message"
            onClick={() => {
              navigator.clipboard
                .writeText('Please save the workflow before executing it')
                .then(() => {
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
        action: (
          <ToastAction
            altText="Copy error message"
            onClick={() => {
              navigator.clipboard.writeText('Invalid JSON in context field').then(() => {
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
  };

  const handleTest = () => {
    if (!id || id === 'new') {
      toast({
        title: 'Error',
        description: 'Please save the workflow before testing it',
        variant: 'destructive',
      });
      return;
    }

    try {
      const context = testContext.trim() ? JSON.parse(testContext) : undefined;
      setTestResult(null);
      // Save the context used for the test (so it can be restored when clicking "Run Another Test")
      if (context) {
        setTestContext(JSON.stringify(context, null, 2));
      }
      testMutation.mutate(context);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid JSON in context field',
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Copy error message"
            onClick={() => {
              navigator.clipboard.writeText('Invalid JSON in context field').then(() => {
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
  };

  const handleSave = () => {
    if (isNew) {
      if (!formData.name || !formData.trigger || !formData.actions) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields (name, trigger, actions)',
          variant: 'destructive',
          action: (
            <ToastAction
              altText="Copy error message"
              onClick={() => {
                navigator.clipboard
                  .writeText('Please fill in all required fields (name, trigger, actions)')
                  .then(() => {
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
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTestDialog(true);
                  setTestResult(null);
                  // Pre-fill context based on workflow
                  const defaultContext: Record<string, unknown> = {
                    tenant_id: tenantId || 'demo',
                    unit_id: unitId || 'sales',
                  };
                  if (
                    formData.type === 'event' &&
                    formData.trigger &&
                    'event' in formData.trigger
                  ) {
                    defaultContext.event = formData.trigger.event;
                    if (formData.trigger.entity) {
                      defaultContext.entity = formData.trigger.entity;
                      defaultContext.entity_id = 'test_entity_id';
                      // Add data object with entity fields for condition evaluation
                      // When entity.updated is emitted, entity data is in data.*
                      defaultContext.data = {
                        status: 'customer', // Example field - user should update with real entity data
                      };
                    }
                  }
                  setTestContext(JSON.stringify(defaultContext, null, 2));
                }}
                disabled={testMutation.isPending}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Workflow
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExecuteDialog(true)}
                disabled={triggerMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Execute Now
              </Button>
            </>
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Job ID
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
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {executions.map((execution) => {
                          const isExpanded = expandedExecutions.has(execution.log_id);
                          return (
                            <>
                              <tr
                                key={execution.log_id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => {
                                  const newExpanded = new Set(expandedExecutions);
                                  if (isExpanded) {
                                    newExpanded.delete(execution.log_id);
                                  } else {
                                    newExpanded.add(execution.log_id);
                                  }
                                  setExpandedExecutions(newExpanded);
                                }}
                              >
                                <td className="px-4 py-4 text-center">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                                  {execution.execution_id.substring(0, 8)}...
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="space-y-1">
                                    <div className="capitalize font-medium">
                                      {execution.trigger_type}
                                    </div>
                                    {execution.trigger_event && (
                                      <div className="text-xs text-gray-500">
                                        Event: {execution.trigger_event}
                                      </div>
                                    )}
                                    {execution.trigger_entity && (
                                      <div className="text-xs text-gray-500">
                                        Entity: {execution.trigger_entity}
                                        {execution.trigger_entity_id &&
                                          ` (${execution.trigger_entity_id.substring(0, 8)}...)`}
                                      </div>
                                    )}
                                    {execution.actor && (
                                      <div className="text-xs text-gray-500">
                                        Actor: {execution.actor}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <Badge
                                    variant={
                                      execution.status === 'completed'
                                        ? 'success'
                                        : execution.status === 'failed'
                                          ? 'destructive'
                                          : execution.status === 'skipped'
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
                              </tr>
                              {isExpanded && (
                                <tr key={`${execution.log_id}-details`}>
                                  <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                    <div className="space-y-4">
                                      {/* Workflow Definition */}
                                      {workflow && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">
                                            Workflow Definition
                                          </h4>
                                          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                            {JSON.stringify(workflow, null, 2)}
                                          </pre>
                                        </div>
                                      )}

                                      {/* Context */}
                                      {execution.context && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2">Context</h4>
                                          <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                            {JSON.stringify(execution.context, null, 2)}
                                          </pre>
                                        </div>
                                      )}

                                      {/* Conditions Evaluated */}
                                      {execution.conditions_evaluated &&
                                        execution.conditions_evaluated.length > 0 && (
                                          <div>
                                            <h4 className="text-sm font-semibold mb-2">
                                              Conditions Evaluated
                                            </h4>
                                            <div className="space-y-2">
                                              {execution.conditions_evaluated.map(
                                                (condition, idx) => (
                                                  <div
                                                    key={idx}
                                                    className="bg-white p-3 rounded border text-sm"
                                                  >
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <Badge
                                                        variant={
                                                          condition.result
                                                            ? 'success'
                                                            : 'destructive'
                                                        }
                                                      >
                                                        {condition.result ? '✓' : '✗'}
                                                      </Badge>
                                                      <span className="font-mono">
                                                        {condition.condition.field}{' '}
                                                        {condition.condition.operator}{' '}
                                                        {JSON.stringify(condition.condition.value)}
                                                      </span>
                                                    </div>
                                                    {condition.field_value !== undefined && (
                                                      <div className="text-xs text-gray-500 mt-1">
                                                        Field value:{' '}
                                                        {JSON.stringify(condition.field_value)}
                                                      </div>
                                                    )}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* Actions Executed */}
                                      {execution.actions_executed &&
                                        execution.actions_executed.length > 0 && (
                                          <div>
                                            <h4 className="text-sm font-semibold mb-2">
                                              Actions Executed
                                            </h4>
                                            <div className="space-y-2">
                                              {execution.actions_executed.map((action, idx) => (
                                                <div
                                                  key={idx}
                                                  className="bg-white p-3 rounded border text-sm"
                                                >
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                      <Badge
                                                        variant={
                                                          action.status === 'completed'
                                                            ? 'success'
                                                            : action.status === 'failed'
                                                              ? 'destructive'
                                                              : 'secondary'
                                                        }
                                                      >
                                                        Action {action.action_index + 1}:{' '}
                                                        {action.action_type} - {action.status}
                                                      </Badge>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                      {action.duration_ms
                                                        ? `${(action.duration_ms / 1000).toFixed(2)}s`
                                                        : '-'}
                                                    </div>
                                                  </div>
                                                  {action.result != null && (
                                                    <div className="mt-2">
                                                      <p className="text-xs font-medium mb-1">
                                                        Result:
                                                      </p>
                                                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                                        {JSON.stringify(action.result, null, 2)}
                                                      </pre>
                                                    </div>
                                                  )}
                                                  {action.error && (
                                                    <div className="mt-2">
                                                      <p className="text-xs font-medium text-red-600 mb-1">
                                                        Error:
                                                      </p>
                                                      <p className="text-xs text-red-600">
                                                        {action.error}
                                                      </p>
                                                    </div>
                                                  )}
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    Started:{' '}
                                                    {format(new Date(action.started_at), 'PPp')}
                                                    {action.completed_at &&
                                                      ` | Completed: ${format(new Date(action.completed_at), 'PPp')}`}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                      {/* Error */}
                                      {execution.error && (
                                        <div>
                                          <h4 className="text-sm font-semibold mb-2 text-red-600">
                                            Error
                                          </h4>
                                          <div className="bg-red-50 border border-red-200 p-3 rounded text-sm">
                                            <p className="text-red-800 font-medium">
                                              {execution.error}
                                            </p>
                                            {execution.error_stack && (
                                              <pre className="text-xs text-red-600 mt-2 overflow-x-auto">
                                                {execution.error_stack}
                                              </pre>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
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

      {/* Test Dialog */}
      {showTestDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowTestDialog(false);
            setTestContext('{}');
            setTestResult(null);
          }}
        >
          <Card
            className="w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Test Workflow</CardTitle>
              <CardDescription>
                Simulate workflow execution without actually executing it. This will validate the
                workflow and show what would happen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!testResult ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-blue-900 mb-1">Current Context Info:</p>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>
                        <span className="font-medium">Tenant ID:</span>{' '}
                        <code className="bg-blue-100 px-1 rounded">{tenantId || 'not set'}</code>
                      </div>
                      <div>
                        <span className="font-medium">Unit ID:</span>{' '}
                        <code className="bg-blue-100 px-1 rounded">{unitId || 'not set'}</code>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        These values will be automatically included in the test context if not
                        specified.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-context">Context (JSON)</Label>
                    <Textarea
                      id="test-context"
                      value={testContext}
                      onChange={(e) => setTestContext(e.target.value)}
                      placeholder={`{
  "event": "entity.updated",
  "entity": "contact",
  "entity_id": "123",
  "tenant_id": "${tenantId || 'demo'}",
  "unit_id": "${unitId || 'sales'}",
  "data": {
    "status": "customer"
  }
}`}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500">
                      Optional: Provide context data as JSON. This simulates the event/data that
                      would trigger the workflow. For event triggers, include: event, entity,
                      entity_id, tenant_id, unit_id, and a{' '}
                      <code className="bg-gray-100 px-1 rounded">data</code> object with entity
                      fields needed for conditions (e.g.,{' '}
                      <code className="bg-gray-100 px-1 rounded">data.status</code>).
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTestDialog(false);
                        setTestContext('{}');
                        setTestResult(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleTest} disabled={testMutation.isPending}>
                      {testMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube className="h-4 w-4 mr-2" />
                          Run Test
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Test Results</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
                          toast({
                            title: 'Copied',
                            description: 'Test result copied to clipboard',
                          });
                        }}
                      >
                        <Clipboard className="h-4 w-4 mr-2" />
                        Copy Result
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestResult(null);
                          // Keep the previous context instead of resetting to empty
                          // The context is already in testContext from the previous test
                        }}
                      >
                        Run Another Test
                      </Button>
                    </div>
                  </div>

                  {/* Test Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Test Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Tested by:</span>{' '}
                        {(testResult as any)?.test_info?.tested_by?.email ||
                          (testResult as any)?.test_info?.tested_by?.user_id ||
                          'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">Tenant:</span>{' '}
                        {(testResult as any)?.test_info?.tested_by?.tenant_id}
                      </div>
                      {(testResult as any)?.test_info?.tested_by?.unit_id && (
                        <div>
                          <span className="font-medium">Unit:</span>{' '}
                          {(testResult as any)?.test_info?.tested_by?.unit_id}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Tested at:</span>{' '}
                        {format(new Date((testResult as any)?.test_info?.tested_at), 'PPp')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trigger Evaluation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Trigger Evaluation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            (testResult as any)?.trigger_evaluation?.would_trigger
                              ? 'success'
                              : 'destructive'
                          }
                        >
                          {(testResult as any)?.trigger_evaluation?.would_trigger
                            ? 'Would Trigger'
                            : 'Would Not Trigger'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Type: {(testResult as any)?.trigger_evaluation?.trigger_type}
                        </span>
                      </div>
                      {(testResult as any)?.trigger_evaluation?.reason && (
                        <p className="text-sm text-gray-600">
                          {(testResult as any)?.trigger_evaluation?.reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Conditions Evaluation */}
                  {(testResult as any)?.conditions_evaluation && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Conditions Evaluation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              (testResult as any)?.conditions_evaluation?.met
                                ? 'success'
                                : 'destructive'
                            }
                          >
                            {(testResult as any)?.conditions_evaluation?.met
                              ? 'All Met'
                              : 'Not Met'}
                          </Badge>
                          {formData.trigger &&
                            'logic' in formData.trigger &&
                            formData.trigger.logic && (
                              <span className="text-xs text-gray-500">
                                Logic:{' '}
                                <code className="bg-gray-100 px-1 rounded">
                                  {formData.trigger.logic}
                                </code>
                              </span>
                            )}
                        </div>
                        <div className="space-y-2 mt-2">
                          {(testResult as any)?.conditions_evaluation?.results?.map(
                            (condition: any, idx: number) => (
                              <div key={idx} className="border rounded p-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant={condition.result ? 'success' : 'destructive'}>
                                    {condition.result ? '✓' : '✗'}
                                  </Badge>
                                  <span className="font-mono">
                                    {condition.condition.field} {condition.condition.operator}{' '}
                                    {JSON.stringify(condition.condition.value)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Field value: {JSON.stringify(condition.field_value)}
                                  {condition.resolved_value !== undefined &&
                                    ` | Resolved: ${JSON.stringify(condition.resolved_value)}`}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions Simulation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Actions Simulation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-gray-600 mb-2">
                        Total: {(testResult as any)?.summary?.total_actions} | Valid:{' '}
                        {(testResult as any)?.summary?.valid_actions} | Invalid:{' '}
                        {(testResult as any)?.summary?.invalid_actions}
                      </div>
                      <div className="space-y-2">
                        {(testResult as any)?.actions_simulation?.map((action: any) => (
                          <div key={action.action_index} className="border rounded p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={action.would_execute ? 'success' : 'destructive'}>
                                  Action {action.action_index + 1}: {action.action_type}
                                </Badge>
                                {action.would_execute ? (
                                  <Badge variant="success">Would Execute</Badge>
                                ) : (
                                  <Badge variant="destructive">Would Not Execute</Badge>
                                )}
                              </div>
                            </div>
                            {action.validation?.errors && action.validation.errors.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-red-600">Errors:</p>
                                <ul className="list-disc list-inside text-xs text-red-600">
                                  {action.validation.errors.map((error: string, idx: number) => (
                                    <li key={idx}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {action.validation?.warnings &&
                              action.validation.warnings.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-yellow-600">Warnings:</p>
                                  <ul className="list-disc list-inside text-xs text-yellow-600">
                                    {action.validation.warnings.map(
                                      (warning: string, idx: number) => (
                                        <li key={idx}>{warning}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            {action.simulated_result && (
                              <div className="mt-2">
                                <p className="text-xs font-medium">Simulated Result:</p>
                                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(action.simulated_result, null, 2)}
                                </pre>
                              </div>
                            )}
                            {action.resolved_data && (
                              <div className="mt-2">
                                <p className="text-xs font-medium">Resolved Data:</p>
                                <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(action.resolved_data, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            (testResult as any)?.summary?.would_execute ? 'success' : 'destructive'
                          }
                          className="text-base"
                        >
                          {(testResult as any)?.summary?.would_execute
                            ? '✓ Workflow Would Execute Successfully'
                            : '✗ Workflow Would Not Execute'}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm space-y-1">
                        <div>
                          Trigger:{' '}
                          {(testResult as any)?.trigger_evaluation?.would_trigger ? '✓' : '✗'}
                        </div>
                        <div>
                          Conditions: {(testResult as any)?.summary?.conditions_met ? '✓' : '✗'}
                        </div>
                        <div>
                          Actions: {(testResult as any)?.summary?.valid_actions}/
                          {(testResult as any)?.summary?.total_actions} valid
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTestDialog(false);
                        setTestContext('{}');
                        setTestResult(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
