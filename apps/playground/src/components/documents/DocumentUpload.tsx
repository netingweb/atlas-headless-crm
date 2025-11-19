import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { documentsApi, type Document } from '@/lib/api/documents';
import { configApi } from '@/lib/api/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Upload, File, X, Loader2 } from 'lucide-react';
import type { DocumentTypeConfig } from '@crm-atlas/types';

interface DocumentUploadProps {
  relatedEntityType?: string;
  relatedEntityId?: string;
  onUploadComplete?: (document: Document) => void;
}

export default function DocumentUpload({
  relatedEntityType,
  relatedEntityId,
  onUploadComplete,
}: DocumentUploadProps) {
  const { tenantId, unitId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Get document types configuration
  const { data: documentsConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['documents-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return { document_types: [] };
      const config = await configApi.getDocumentsConfig(tenantId);
      return config || { document_types: [] };
    },
    enabled: !!tenantId,
  });

  const documentTypes = documentsConfig?.document_types || [];

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!tenantId || !unitId || !documentType) {
        throw new Error('Missing required fields');
      }

      return documentsApi.upload(tenantId, unitId, {
        file,
        title: file.name,
        document_type: documentType,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
      });
    },
    onSuccess: (document) => {
      toast({
        title: 'Document uploaded',
        description: `${document.filename} uploaded successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['documents', tenantId, unitId] });
      queryClient.invalidateQueries({ queryKey: ['entity-documents'] });
      if (onUploadComplete) {
        onUploadComplete(document);
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to upload document';
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!documentType) {
      toast({
        title: 'Document type required',
        description: 'Please select a document type',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        await uploadMutation.mutateAsync(file);
      }
      setSelectedFiles([]);
      setDocumentType('');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>Upload one or more documents to the system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          {isLoadingConfig ? (
            <div className="text-sm text-gray-500 p-2 border rounded-md bg-gray-50">
              Loading document types...
            </div>
          ) : documentTypes.length === 0 ? (
            <div className="text-sm text-yellow-600 p-2 border border-yellow-200 rounded-md bg-yellow-50">
              No document types configured. Please configure document types in the settings.
            </div>
          ) : (
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type: DocumentTypeConfig) => (
                  <SelectItem key={type.name} value={type.name}>
                    {type.display_name || type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-input">Files</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0 || !documentType}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ''}Document
              {selectedFiles.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
