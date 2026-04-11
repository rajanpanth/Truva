import { z } from 'zod';

export const agentQuerySchema = z.object({
  tier: z.coerce.number().int().min(1).max(3).optional(),
  task_type: z.string().optional(),
  is_active: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().max(100).optional(),
});

export type AgentQuery = z.infer<typeof agentQuerySchema>;
