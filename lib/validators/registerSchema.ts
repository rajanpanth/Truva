import { z } from 'zod';

const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const registerAgentStep1Schema = z.object({
  name: z.string().min(2, 'Agent name must be at least 2 characters').max(64, 'Agent name must be under 64 characters'),
  public_key: z.string().regex(base58Regex, 'Must be a valid Solana base58 address (32-44 characters)'),
  operator_name: z.string().min(2, 'Operator name is required').max(100),
  operator_email: z.string().email('Must be a valid email address'),
  task_type: z.enum(['trading', 'yield', 'data', 'execution', 'risk', 'treasury', 'monitoring', 'payment'], {
    required_error: 'Task type is required',
  }),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
});

export const registerAgentStep2Schema = z.object({
  max_tx_size: z.number().min(1, 'Must be at least 1').max(1_000_000, 'Max transaction size too large'),
  rate_limit: z.number().min(1, 'Must be at least 1').max(1000, 'Maximum 1000 per hour'),
  chains: z.array(z.enum(['solana', 'ethereum', 'base', 'arbitrum'])).min(1, 'Select at least one chain'),
  spending_behavior: z.enum(['conservative', 'standard', 'aggressive']).optional(),
  metadata: z.string().optional().refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Metadata must be valid JSON' }
  ),
});

export const registerAgentFullSchema = registerAgentStep1Schema.merge(registerAgentStep2Schema);

export type RegisterStep1Data = z.infer<typeof registerAgentStep1Schema>;
export type RegisterStep2Data = z.infer<typeof registerAgentStep2Schema>;
export type RegisterAgentData = z.infer<typeof registerAgentFullSchema>;
