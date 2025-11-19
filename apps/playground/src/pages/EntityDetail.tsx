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
import DocumentUpload from '@/components/documents/DocumentUpload';
import { documentsApi } from '@/lib/api/documents';

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

// Document-specific readonly fields (all except title)
const DOCUMENT_READONLY_FIELDS = [
  '_id',
  'id',
  'tenant_id',
  'unit_id',
  'created_at',
  'updated_at',
  'filename',
  'mime_type',
  'file_size',
  'storage_path',
  'document_type',
  'related_entity_type',
  'related_entity_id',
  'processing_status',
  'extracted_content',
  'metadata',
];

// Component to display documents for an entity
function EntityDocumentsList({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();

  const {
    data: documents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['entity-documents', tenantId, unitId, entityType, entityId],
    queryFn: () => documentsApi.getForEntity(tenantId || '', unitId || '', entityType, entityId),
    enabled: !!tenantId && !!unitId && !!entityType && !!entityId,
    retry: 1,
  });

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const blob = await documentsApi.download(tenantId || '', unitId || '', documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentsApi.delete(tenantId || '', unitId || '', documentId);
      toast({
        title: 'Document deleted',
        description: 'Document has been deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Loading documents...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">
            Error loading documents: {(error as Error).message || 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">No documents attached to this entity.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attached Documents</CardTitle>
        <CardDescription>{documents.length} document(s) attached</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
            >
              <div className="flex-1">
                <p className="font-medium">{doc.title}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>{doc.filename}</span>
                  <span>{(doc.file_size / 1024).toFixed(2)} KB</span>
                  <span className="capitalize">{doc.document_type}</span>
                  <span
                    className={`capitalize ${
                      doc.processing_status === 'completed'
                        ? 'text-green-600'
                        : doc.processing_status === 'failed'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                    }`}
                  >
                    {doc.processing_status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc._id, doc.filename)}
                >
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(doc._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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
    gcTime: 0, // Don't cache (gcTime replaces cacheTime in react-query v5)
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
      if (entityDef && 'fields' in entityDef && Array.isArray(entityDef.fields)) {
        entityDef.fields.forEach((field: { name: string; default?: unknown }) => {
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
    const readonlyFields = entityType === 'document' ? DOCUMENT_READONLY_FIELDS : READONLY_FIELDS;
    Object.keys(formData).forEach((key) => {
      if (!readonlyFields.includes(key)) {
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
    // For documents, only title is editable, all other fields are readonly
    const isDocumentEntity = entityType === 'document';
    const isReadonly = isDocumentEntity
      ? DOCUMENT_READONLY_FIELDS.includes(field.name)
      : READONLY_FIELDS.includes(field.name);
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

    // Special handling for related_entity_id in documents - show link if entity exists
    // This must be checked BEFORE the generic reference field handler
    if (field.name === 'related_entity_id' && entityType === 'document') {
      const relatedEntityType = formData.related_entity_type as string;
      // Handle both _id and id formats, and also check for ObjectId string
      const relatedEntityId = fieldValue ? String(fieldValue).trim() : null;

      // Debug log to see what values we have
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 related_entity_id field:', {
          fieldName: field.name,
          fieldValue,
          relatedEntityType,
          relatedEntityId,
          formData: formData.related_entity_id,
        });
      }

      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-gray-500">
            {field.name} (readonly)
          </Label>
          {relatedEntityType &&
          relatedEntityId &&
          relatedEntityId !== 'null' &&
          relatedEntityId !== 'undefined' &&
          relatedEntityId.length > 0 ? (
            <div className="flex items-center gap-2">
              <Input
                id={field.name}
                value={relatedEntityId}
                readOnly
                className="bg-gray-50 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/entities/${relatedEntityType}/${relatedEntityId}`)}
              >
                View {relatedEntityType}
              </Button>
            </div>
          ) : (
            <Input
              id={field.name}
              value={relatedEntityId || ''}
              readOnly
              className="bg-gray-50"
              placeholder="No related entity"
            />
          )}
        </div>
      );
    }

    if (field.type === 'reference' && field.reference_entity) {
      // Special handling for related_entity_type in documents - show as readonly with display value
      if (field.name === 'related_entity_type' && entityType === 'document') {
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-gray-500">
              {field.name} (readonly)
            </Label>
            <Input
              id={field.name}
              value={String(fieldValue ?? '')}
              readOnly
              className="bg-gray-50"
            />
          </div>
        );
      }

      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            value={fieldValue ? String(fieldValue) : undefined}
            onValueChange={(value) => handleFieldChange(field.name, value || null)}
            disabled={isReadonly}
          >
            <SelectTrigger className={isReadonly ? 'bg-gray-50' : ''}>
              <SelectValue
                placeholder={`Select ${field.reference_entity}${field.required ? '' : ' (optional)'}`}
              />
            </SelectTrigger>
            <SelectContent>
              {referenceOptions?.map((option) => {
                const optionId = (option._id || option.id || '') as string | number;
                const displayName = (option.name ||
                  option.title ||
                  option.email ||
                  String(optionId)) as string;
                return (
                  <SelectItem key={String(optionId)} value={String(optionId)}>
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
      // Special handling for extracted_content - show full content, readonly, in a larger textarea
      if (field.name === 'extracted_content') {
        return (
          <div key={field.name} className="space-y-2 col-span-full">
            <Label htmlFor={field.name} className="text-gray-500 text-sm font-semibold">
              {field.name} (readonly)
            </Label>
            <Textarea
              id={field.name}
              value={String(fieldValue ?? '')}
              readOnly
              className="bg-gray-50 font-mono text-xs border-gray-200"
              rows={15}
              style={{ resize: 'vertical' }}
            />
          </div>
        );
      }

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
            readOnly={isReadonly}
            className={isReadonly ? 'bg-gray-50' : ''}
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

    // Special handling for metadata field - show formatted JSON in a larger textarea
    if (
      field.name === 'metadata' &&
      (field.type === 'json' || typeof fieldValue === 'object' || fieldValue !== null)
    ) {
      const metadataValue =
        typeof fieldValue === 'object' && fieldValue !== null
          ? JSON.stringify(fieldValue, null, 2)
          : fieldValue
            ? String(fieldValue)
            : '';

      return (
        <div key={field.name} className="space-y-2 col-span-full">
          <Label htmlFor={field.name} className="text-gray-500 text-sm font-semibold">
            {field.name} (readonly)
          </Label>
          <Textarea
            id={field.name}
            value={metadataValue}
            readOnly
            className="bg-gray-50 font-mono text-xs border-gray-200"
            rows={12}
            style={{ resize: 'vertical' }}
          />
        </div>
      );
    }

    // Default: string, email, url
    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name} className={isReadonly ? 'text-gray-500' : ''}>
          {field.name}
          {field.required && !isReadonly && <span className="text-red-500 ml-1">*</span>}
          {isReadonly && <span className="text-gray-400 ml-1">(readonly)</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          value={String(fieldValue ?? '')}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          required={field.required && !isReadonly}
          readOnly={isReadonly}
          className={isReadonly ? 'bg-gray-50' : ''}
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
          {!isNew && entityType !== 'document' && (
            <TabsTrigger value="documents">Documents</TabsTrigger>
          )}
          {!isNew && <TabsTrigger value="raw">Raw MongoDB</TabsTrigger>}
          <TabsTrigger value="json">JSON Response</TabsTrigger>
        </TabsList>

        {!isNew && entityType !== 'document' && (
          <TabsContent value="documents">
            <div className="space-y-6">
              <DocumentUpload
                relatedEntityType={entityType}
                relatedEntityId={id}
                onUploadComplete={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['entity-documents', tenantId, unitId, entityType, id],
                  });
                }}
              />
              <EntityDocumentsList entityType={entityType || ''} entityId={id || ''} />
            </div>
          </TabsContent>
        )}

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
                    {entityDef && 'fields' in entityDef && Array.isArray(entityDef.fields)
                      ? entityDef.fields.map(
                          (field: {
                            name: string;
                            type:
                              | 'string'
                              | 'number'
                              | 'boolean'
                              | 'text'
                              | 'url'
                              | 'email'
                              | 'date'
                              | 'json'
                              | 'reference';
                            required: boolean;
                            indexed: boolean;
                            searchable: boolean;
                            embeddable: boolean;
                            reference_entity?: string;
                            default?: unknown;
                            validation?: Record<string, unknown>;
                          }) => {
                            // Skip readonly fields (already shown above)
                            if (READONLY_FIELDS.includes(field.name)) {
                              return null;
                            }
                            // Special handling for related_entity_id in documents - use renderField which has special logic
                            // This must be checked BEFORE the generic reference field handler
                            if (field.name === 'related_entity_id' && entityType === 'document') {
                              return renderField(field);
                            }
                            // For reference fields, we need to load options
                            // Skip related_entity_id for documents as it's handled above
                            if (
                              field.type === 'reference' &&
                              field.reference_entity &&
                              !(field.name === 'related_entity_id' && entityType === 'document')
                            ) {
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
                          }
                        )
                      : null}
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

  // Use local state to ensure Select is always controlled
  // Use a sentinel value "__none__" to represent "no selection" instead of undefined
  // Hooks must be called before any conditional returns
  const NONE_VALUE = '__none__';
  const [selectValue, setSelectValue] = useState<string>(
    value != null ? String(value) : NONE_VALUE
  );

  // Sync local state with prop value when it changes
  useEffect(() => {
    setSelectValue(value != null ? String(value) : NONE_VALUE);
  }, [value]);

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
        value={selectValue}
        onValueChange={(val) => {
          setSelectValue(val);
          // Convert sentinel value to null for the parent component
          onChange(val === NONE_VALUE ? null : val);
        }}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={isLoading ? 'Loading...' : `Select ${referenceEntity} (optional)`}
          />
        </SelectTrigger>
        <SelectContent>
          {!field.required && <SelectItem value={NONE_VALUE}>None</SelectItem>}
          {options?.map((option) => {
            const optionId = (option._id || option.id || '') as string | number;
            const displayName = (option.name ||
              option.title ||
              option.email ||
              String(optionId)) as string;
            return (
              <SelectItem key={String(optionId)} value={String(optionId)}>
                {displayName}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
