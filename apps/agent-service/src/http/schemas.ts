import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
});

export const chatRequestSchema = z.object({
  tenantId: z.string().min(1),
  unitId: z.string().min(1),
  agentId: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  viewContext: z
    .object({
      entityType: z.string().nullable().optional(),
      entityId: z.string().nullable().optional(),
      route: z.string().nullable().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

