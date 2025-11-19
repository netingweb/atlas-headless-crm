import { z } from 'zod';
export declare const DocumentTypeConfigSchema: z.ZodObject<
  {
    name: z.ZodString;
    display_name: z.ZodString;
    allowed_mime_types: z.ZodArray<z.ZodString, 'many'>;
    max_upload_size: z.ZodOptional<z.ZodNumber>;
    embedding_config: z.ZodOptional<
      z.ZodObject<
        {
          model: z.ZodEnum<['openai', 'jina', 'local']>;
          model_name: z.ZodOptional<z.ZodString>;
          chunk_size: z.ZodOptional<z.ZodNumber>;
          chunk_overlap: z.ZodOptional<z.ZodNumber>;
        },
        'strip',
        z.ZodTypeAny,
        {
          model: 'openai' | 'jina' | 'local';
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          model_name?: string | undefined;
        },
        {
          model: 'openai' | 'jina' | 'local';
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          model_name?: string | undefined;
        }
      >
    >;
    vision_enabled: z.ZodOptional<z.ZodBoolean>;
    vision_model: z.ZodOptional<z.ZodString>;
    ocr_enabled: z.ZodOptional<z.ZodBoolean>;
  },
  'strip',
  z.ZodTypeAny,
  {
    name: string;
    display_name: string;
    allowed_mime_types: string[];
    vision_enabled?: boolean | undefined;
    vision_model?: string | undefined;
    ocr_enabled?: boolean | undefined;
    max_upload_size?: number | undefined;
    embedding_config?:
      | {
          model: 'openai' | 'jina' | 'local';
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          model_name?: string | undefined;
        }
      | undefined;
  },
  {
    name: string;
    display_name: string;
    allowed_mime_types: string[];
    vision_enabled?: boolean | undefined;
    vision_model?: string | undefined;
    ocr_enabled?: boolean | undefined;
    max_upload_size?: number | undefined;
    embedding_config?:
      | {
          model: 'openai' | 'jina' | 'local';
          chunk_size?: number | undefined;
          chunk_overlap?: number | undefined;
          model_name?: string | undefined;
        }
      | undefined;
  }
>;
export type DocumentTypeConfig = z.infer<typeof DocumentTypeConfigSchema>;
export declare const DocumentsConfigSchema: z.ZodObject<
  {
    tenant_id: z.ZodString;
    document_types: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          display_name: z.ZodString;
          allowed_mime_types: z.ZodArray<z.ZodString, 'many'>;
          max_upload_size: z.ZodOptional<z.ZodNumber>;
          embedding_config: z.ZodOptional<
            z.ZodObject<
              {
                model: z.ZodEnum<['openai', 'jina', 'local']>;
                model_name: z.ZodOptional<z.ZodString>;
                chunk_size: z.ZodOptional<z.ZodNumber>;
                chunk_overlap: z.ZodOptional<z.ZodNumber>;
              },
              'strip',
              z.ZodTypeAny,
              {
                model: 'openai' | 'jina' | 'local';
                chunk_size?: number | undefined;
                chunk_overlap?: number | undefined;
                model_name?: string | undefined;
              },
              {
                model: 'openai' | 'jina' | 'local';
                chunk_size?: number | undefined;
                chunk_overlap?: number | undefined;
                model_name?: string | undefined;
              }
            >
          >;
          vision_enabled: z.ZodOptional<z.ZodBoolean>;
          vision_model: z.ZodOptional<z.ZodString>;
          ocr_enabled: z.ZodOptional<z.ZodBoolean>;
        },
        'strip',
        z.ZodTypeAny,
        {
          name: string;
          display_name: string;
          allowed_mime_types: string[];
          vision_enabled?: boolean | undefined;
          vision_model?: string | undefined;
          ocr_enabled?: boolean | undefined;
          max_upload_size?: number | undefined;
          embedding_config?:
            | {
                model: 'openai' | 'jina' | 'local';
                chunk_size?: number | undefined;
                chunk_overlap?: number | undefined;
                model_name?: string | undefined;
              }
            | undefined;
        },
        {
          name: string;
          display_name: string;
          allowed_mime_types: string[];
          vision_enabled?: boolean | undefined;
          vision_model?: string | undefined;
          ocr_enabled?: boolean | undefined;
          max_upload_size?: number | undefined;
          embedding_config?:
            | {
                model: 'openai' | 'jina' | 'local';
                chunk_size?: number | undefined;
                chunk_overlap?: number | undefined;
                model_name?: string | undefined;
              }
            | undefined;
        }
      >,
      'many'
    >;
  },
  'strip',
  z.ZodTypeAny,
  {
    tenant_id: string;
    document_types: {
      name: string;
      display_name: string;
      allowed_mime_types: string[];
      vision_enabled?: boolean | undefined;
      vision_model?: string | undefined;
      ocr_enabled?: boolean | undefined;
      max_upload_size?: number | undefined;
      embedding_config?:
        | {
            model: 'openai' | 'jina' | 'local';
            chunk_size?: number | undefined;
            chunk_overlap?: number | undefined;
            model_name?: string | undefined;
          }
        | undefined;
    }[];
  },
  {
    tenant_id: string;
    document_types: {
      name: string;
      display_name: string;
      allowed_mime_types: string[];
      vision_enabled?: boolean | undefined;
      vision_model?: string | undefined;
      ocr_enabled?: boolean | undefined;
      max_upload_size?: number | undefined;
      embedding_config?:
        | {
            model: 'openai' | 'jina' | 'local';
            chunk_size?: number | undefined;
            chunk_overlap?: number | undefined;
            model_name?: string | undefined;
          }
        | undefined;
    }[];
  }
>;
export type DocumentsConfig = z.infer<typeof DocumentsConfigSchema>;
export declare const DocumentProcessingStatusSchema: z.ZodEnum<
  ['pending', 'processing', 'completed', 'failed']
>;
export type DocumentProcessingStatus = z.infer<typeof DocumentProcessingStatusSchema>;
//# sourceMappingURL=documents.d.ts.map
