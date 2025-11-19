import { apiClient } from './client';

export interface Document {
  _id: string;
  title: string;
  filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  document_type: string;
  related_entity_type?: string;
  related_entity_id?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_content?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface UploadDocumentParams {
  file: File;
  title: string;
  document_type: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

class DocumentsApi {
  async upload(tenantId: string, unitId: string, params: UploadDocumentParams): Promise<Document> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('title', params.title);
    formData.append('document_type', params.document_type);
    if (params.related_entity_type) {
      formData.append('related_entity_type', params.related_entity_type);
    }
    if (params.related_entity_id) {
      formData.append('related_entity_id', params.related_entity_id);
    }

    const response = await apiClient.post<Document>(`/${tenantId}/${unitId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async list(
    tenantId: string,
    unitId: string,
    filters?: Record<string, unknown>
  ): Promise<Document[]> {
    const response = await apiClient.get<Document[]>(`/${tenantId}/${unitId}/documents`, {
      params: filters,
    });
    return response.data;
  }

  async get(tenantId: string, unitId: string, id: string): Promise<Document> {
    const response = await apiClient.get<Document>(`/${tenantId}/${unitId}/documents/${id}`);
    return response.data;
  }

  async update(
    tenantId: string,
    unitId: string,
    id: string,
    data: Partial<Document>
  ): Promise<Document> {
    const response = await apiClient.put<Document>(`/${tenantId}/${unitId}/documents/${id}`, data);
    return response.data;
  }

  async delete(tenantId: string, unitId: string, id: string): Promise<void> {
    await apiClient.delete(`/${tenantId}/${unitId}/documents/${id}`);
  }

  async download(tenantId: string, unitId: string, id: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/${tenantId}/${unitId}/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getForEntity(
    tenantId: string,
    unitId: string,
    entityType: string,
    entityId: string
  ): Promise<Document[]> {
    const response = await apiClient.get<Document[]>(
      `/${tenantId}/${unitId}/documents/entities/${entityType}/${entityId}`
    );
    return response.data;
  }

  async getQueueStats(
    tenantId: string,
    unitId: string
  ): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const response = await apiClient.get<{
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }>(`/${tenantId}/${unitId}/documents/queue/stats`);
    return response.data;
  }

  async getDocumentJobs(
    tenantId: string,
    unitId: string,
    documentId: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      data: unknown;
      state: string;
      progress: number | unknown;
      returnvalue: unknown;
      failedReason?: string;
      timestamp?: number;
      processedOn?: number;
      finishedOn?: number;
    }>
  > {
    const response = await apiClient.get<
      Array<{
        id: string;
        name: string;
        data: unknown;
        state: string;
        progress: number | unknown;
        returnvalue: unknown;
        failedReason?: string;
        timestamp?: number;
        processedOn?: number;
        finishedOn?: number;
      }>
    >(`/${tenantId}/${unitId}/documents/queue/jobs/${documentId}`);
    return response.data;
  }

  async cleanQueue(
    tenantId: string,
    unitId: string,
    grace?: number
  ): Promise<{ completed: number; failed: number }> {
    const params = grace !== undefined ? { grace: grace.toString() } : {};
    const response = await apiClient.post<{ completed: number; failed: number }>(
      `/${tenantId}/${unitId}/documents/queue/clean`,
      {},
      { params }
    );
    return response.data;
  }

  async getQueueJobs(
    tenantId: string,
    unitId: string,
    states?: string[],
    limit?: number
  ): Promise<
    Array<{
      id: string;
      name: string;
      data: unknown;
      state: string;
      progress: number | unknown;
      returnvalue: unknown;
      failedReason?: string;
      stacktrace?: string;
      timestamp?: number;
      processedOn?: number;
      finishedOn?: number;
      attemptsMade?: number;
    }>
  > {
    const params: Record<string, string> = {};
    if (states) params.states = states.join(',');
    if (limit) params.limit = limit.toString();

    const response = await apiClient.get<
      Array<{
        id: string;
        name: string;
        data: unknown;
        state: string;
        progress: number | unknown;
        returnvalue: unknown;
        failedReason?: string;
        stacktrace?: string;
        timestamp?: number;
        processedOn?: number;
        finishedOn?: number;
        attemptsMade?: number;
      }>
    >(`/${tenantId}/${unitId}/documents/queue/jobs`, { params });
    return response.data;
  }

  async getFailedJobs(
    tenantId: string,
    unitId: string,
    limit?: number
  ): Promise<
    Array<{
      id: string;
      name: string;
      data: unknown;
      state: string;
      failedReason?: string;
      stacktrace?: string;
      timestamp?: number;
      processedOn?: number;
      finishedOn?: number;
      attemptsMade?: number;
    }>
  > {
    const params: Record<string, string> = {};
    if (limit) params.limit = limit.toString();

    const response = await apiClient.get<
      Array<{
        id: string;
        name: string;
        data: unknown;
        state: string;
        failedReason?: string;
        stacktrace?: string;
        timestamp?: number;
        processedOn?: number;
        finishedOn?: number;
        attemptsMade?: number;
      }>
    >(`/${tenantId}/${unitId}/documents/queue/failed`, { params });
    return response.data;
  }
}

export const documentsApi = new DocumentsApi();
