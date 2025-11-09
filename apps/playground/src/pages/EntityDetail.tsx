import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { entitiesApi, type Entity } from '@/lib/api/entities';
import { configApi, type EntityDefinition } from '@/lib/api/config';
import { apiClient } from '@/lib/api/client';
import { isApiAvailable } from '@/lib/api/permissions';
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
import { ArrowLeft, Save, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Readonly fields that should not be editable
const READONLY_FIELDS = [
  '_id',
  'id',
  'tenant_id',
  'unit_id',
  'created_at',
  'updated_at',
  'app_id',
  'ownership',
  'visible_to',
];

export default function EntityDetail() {
  const { entityType, id } = useParams<{ entityType: string; id: string }>();
  const navigate = useNavigate();
  const { tenantId, unitId, user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  // Get permissions
  const { data: permissions } = useQuery({
    queryKey: ['permissions', tenantId],
    queryFn: () => configApi.getPermissions(tenantId || ''),
    enabled: !!tenantId,
  });

  // Check permissions
  const canCreate = isApiAvailable('entities.create', user || null, permissions || null);
  const canUpdate = isApiAvailable('entities.update', user || null, permissions || null);

  // Get entity definition
  const {
    data: entityDef,
    isLoading: isLoadingDef,
    error: defError,
  } = useQuery({
    queryKey: ['entity-definition', tenantId, entityType],
    queryFn: async () => {
      // Clear cache on API side first to ensure fresh data
      try {
        await apiClient.get(`/${tenantId}/config/clear-cache`);
      } catch (e) {
        // Ignore cache clear errors
      }
      const def = await configApi.getEntity(tenantId || '', entityType || '');
      // Debug log for contact entity
      if (def && entityType === 'contact') {
        const statusField = def.fields.find((f) => f.name === 'status');
        console.log('🔍 Contact entity definition loaded:', def);
        console.log('🔍 Status field:', statusField);
        console.log('🔍 Has validation:', !!statusField?.validation);
        console.log('🔍 Validation object:', statusField?.validation);
        if (statusField?.validation) {
          console.log('🔍 Validation keys:', Object.keys(statusField.validation));
          console.log('🔍 Enum value:', statusField.validation.enum);
          console.log('🔍 Is enum array:', Array.isArray(statusField.validation.enum));
        }
      }
      return def;
    },
    enabled: !!tenantId && !!entityType,
    retry: 2,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  // Get entity data
  const { data: entity, isLoading } = useQuery({
    queryKey: ['entity', tenantId, unitId, entityType, id],
    queryFn: () =>
      entitiesApi.getById(tenantId || '', unitId || '', entityType || '', id || '', true),
    enabled: !!tenantId && !!unitId && !!entityType && !!id && !isNew,
  });

  // Form state
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [responseData, setResponseData] = useState<Entity | null>(null);

  // Initialize form data
  useEffect(() => {
    if (isNew) {
      // Initialize with defaults for new entity
      const defaults: Record<string, unknown> = {};
      if (entityDef) {
        entityDef.fields.forEach((field) => {
          if (field.default !== undefined) {
            defaults[field.name] = field.default;
          }
        });
      }
      setFormData(defaults);
    } else if (entity) {
      setFormData(entity);
    }
  }, [entity, isNew, entityDef]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      entitiesApi.create(tenantId || '', unitId || '', entityType || '', data),
    onSuccess: (data) => {
      setResponseData(data);
      toast({
        title: 'Success',
        description: `${entityType} created successfully and indexed in Typesense/Qdrant`,
      });
      // Invalidate queries to refresh the list and current entity
      queryClient.invalidateQueries({ queryKey: ['entity', tenantId, unitId, entityType] });
      // Refresh current entity if editing
      if (!isNew) {
        queryClient.invalidateQueries({ queryKey: ['entity', tenantId, unitId, entityType, id] });
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create entity';
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
    mutationFn: (data: Record<string, unknown>) =>
      entitiesApi.update(tenantId || '', unitId || '', entityType || '', id || '', data),
    onSuccess: (data) => {
      setResponseData(data);
      toast({
        title: 'Success',
        description: `${entityType} updated successfully and re-indexed in Typesense/Qdrant`,
      });
      // Invalidate queries to refresh the list and current entity
      queryClient.invalidateQueries({ queryKey: ['entity', tenantId, unitId, entityType, id] });
      queryClient.invalidateQueries({ queryKey: ['entity', tenantId, unitId, entityType] });
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to update entity';
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

  // Reference options loading is handled inline in ReferenceField component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out readonly fields and system fields
    const submitData: Record<string, unknown> = {};
    Object.keys(formData).forEach((key) => {
      if (!READONLY_FIELDS.includes(key)) {
        submitData[key] = formData[key];
      }
    });

    if (isNew) {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate(submitData);
    }
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const renderField = (field: EntityDefinition['fields'][0], referenceOptions?: Entity[]) => {
    const isReadonly = READONLY_FIELDS.includes(field.name);
    const fieldValue = formData[field.name];

    if (isReadonly) {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-gray-500">
            {field.name} (readonly)
          </Label>
          <Input id={field.name} value={String(fieldValue ?? '')} readOnly className="bg-gray-50" />
        </div>
      );
    }

    // Check if field has enum validation (for dropdown) - check BEFORE reference
    // Type guard to check if validation.enum exists and is an array
    const hasEnum =
      field.validation &&
      typeof field.validation === 'object' &&
      'enum' in field.validation &&
      Array.isArray(field.validation.enum);

    if (hasEnum) {
      const enumValues = (field.validation as { enum: string[] }).enum;
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            value={fieldValue ? String(fieldValue) : undefined}
            onValueChange={(value) => handleFieldChange(field.name, value || null)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${field.name}${field.required ? '' : ' (optional)'}`}
              />
            </SelectTrigger>
            <SelectContent>
              {enumValues.map((enumValue: string) => (
                <SelectItem key={enumValue} value={enumValue}>
                  {enumValue.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === 'reference' && field.reference_entity) {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            value={fieldValue ? String(fieldValue) : undefined}
            onValueChange={(value) => handleFieldChange(field.name, value || null)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${field.reference_entity}${field.required ? '' : ' (optional)'}`}
              />
            </SelectTrigger>
            <SelectContent>
              {referenceOptions?.map((option) => {
                const displayName =
                  option.name ||
                  option.title ||
                  option.email ||
                  String(option._id || option.id || '');
                return (
                  <SelectItem key={option._id || option.id} value={String(option._id || option.id)}>
                    {displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === 'text') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={field.name}
            value={String(fieldValue ?? '')}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
            rows={4}
          />
        </div>
      );
    }

    if (field.type === 'boolean') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.name}
              checked={Boolean(fieldValue)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="w-4 h-4"
            />
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.name}
            type="date"
            value={fieldValue ? new Date(fieldValue as string).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.name}
            type="number"
            value={fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : ''}
            onChange={(e) =>
              handleFieldChange(field.name, e.target.value === '' ? null : Number(e.target.value))
            }
            required={field.required}
          />
        </div>
      );
    }

    // Default: string, email, url
    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {field.name}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          value={String(fieldValue ?? '')}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required}
        />
      </div>
    );
  };

  if (isLoading || isLoadingDef) {
    return <div>Loading...</div>;
  }

  if (defError) {
    console.error('Error loading entity definition:', defError);
    return (
      <div className="space-y-4">
        <div className="text-red-500">
          Error loading entity definition:{' '}
          {defError instanceof Error ? defError.message : 'Unknown error'}
        </div>
        <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
          {JSON.stringify(defError, null, 2)}
        </pre>
      </div>
    );
  }

  if (!entityDef) {
    return (
      <div className="space-y-4">
        <div className="text-red-500 font-semibold">
          Entity definition not found for: {entityType}
        </div>
        <div className="text-sm text-gray-500">
          <p>Tenant: {tenantId || 'not set'}</p>
          <p>Entity Type: {entityType || 'not set'}</p>
          <p className="mt-2">Please check:</p>
          <ul className="list-disc list-inside mt-1">
            <li>That the entity type is correct</li>
            <li>That the API is running and accessible</li>
            <li>Browser console for detailed error messages</li>
          </ul>
        </div>
        {defError && (
          <div className="mt-4">
            <p className="text-sm font-semibold">Error details:</p>
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto mt-2">
              {JSON.stringify(defError, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Reference fields are handled inline in the form rendering

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold capitalize">
            {isNew ? `Create ${entityType}` : `Edit ${entityType}`}
          </h1>
          <p className="text-gray-500">
            {isNew ? `Create a new ${entityType}` : `Edit ${entityType} details`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="form" className="w-full">
        <TabsList>
          <TabsTrigger value="form">Form</TabsTrigger>
          {!isNew && <TabsTrigger value="raw">Raw MongoDB</TabsTrigger>}
          <TabsTrigger value="json">JSON Response</TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>Entity Form</CardTitle>
              <CardDescription>
                {isNew ? 'Create a new entity' : 'Edit entity details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Readonly system fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  {READONLY_FIELDS.map((fieldName) => {
                    const value = formData[fieldName];
                    if (value === undefined && value === null) return null;
                    return (
                      <div key={fieldName} className="space-y-2">
                        <Label htmlFor={fieldName} className="text-gray-500">
                          {fieldName} (readonly)
                        </Label>
                        <Input
                          id={fieldName}
                          value={
                            typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
                          }
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Editable fields from entity definition */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Fields</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {entityDef.fields.map((field) => {
                      // Skip readonly fields (already shown above)
                      if (READONLY_FIELDS.includes(field.name)) {
                        return null;
                      }
                      // For reference fields, we need to load options
                      if (field.type === 'reference' && field.reference_entity) {
                        return (
                          <ReferenceField
                            key={field.name}
                            field={field}
                            value={formData[field.name]}
                            onChange={(value) => handleFieldChange(field.name, value)}
                            referenceEntity={field.reference_entity}
                            tenantId={tenantId || ''}
                            unitId={unitId || ''}
                          />
                        );
                      }
                      return renderField(field);
                    })}
                  </div>
                </div>

                <div className="flex gap-4">
                  {(isNew ? canCreate : canUpdate) ? (
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Saving...'
                        : isNew
                          ? 'Create'
                          : 'Update'}
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-500 flex items-center">
                      {isNew
                        ? 'You do not have permission to create entities'
                        : 'You do not have permission to update entities'}
                    </div>
                  )}
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {!isNew && (
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw MongoDB Data</CardTitle>
                <CardDescription>Original data from MongoDB (as received from API)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-gray-500">Loading raw data...</p>
                ) : entity ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Showing raw data for entity ID:{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded">{id}</code>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(JSON.stringify(entity, null, 2))
                            .then(() => {
                              toast({
                                title: 'Copied',
                                description: 'Raw MongoDB data copied to clipboard',
                              });
                            });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                      </Button>
                    </div>
                    <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-[600px] border">
                      {JSON.stringify(entity, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-gray-500">No data available. Entity may not exist.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle>JSON Response</CardTitle>
              <CardDescription>Last API response after create/update</CardDescription>
            </CardHeader>
            <CardContent>
              {responseData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Response from last create/update operation
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(JSON.stringify(responseData, null, 2))
                          .then(() => {
                            toast({
                              title: 'Copied',
                              description: 'Response data copied to clipboard',
                            });
                          });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </Button>
                  </div>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-[600px] border">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">
                  No response yet. Submit the form to see the response.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component for reference fields with async loading
function ReferenceField({
  field,
  value,
  onChange,
  referenceEntity,
  tenantId,
  unitId,
}: {
  field: EntityDefinition['fields'][0];
  value: unknown;
  onChange: (value: unknown) => void;
  referenceEntity: string;
  tenantId: string;
  unitId: string;
}) {
  const { data: options, isLoading } = useQuery({
    queryKey: ['reference-options', tenantId, unitId, referenceEntity],
    queryFn: () => entitiesApi.list({ tenant: tenantId, unit: unitId, entity: referenceEntity }),
    enabled: !!tenantId && !!unitId,
  });

  const isReadonly = READONLY_FIELDS.includes(field.name);

  if (isReadonly) {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name} className="text-gray-500">
          {field.name} (readonly)
        </Label>
        <Input id={field.name} value={String(value ?? '')} readOnly className="bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select
        value={value ? String(value) : undefined}
        onValueChange={(val) => onChange(val || null)}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={isLoading ? 'Loading...' : `Select ${referenceEntity} (optional)`}
          />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => {
            const displayName =
              option.name || option.title || option.email || String(option._id || option.id || '');
            return (
              <SelectItem key={option._id || option.id} value={String(option._id || option.id)}>
                {displayName}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
