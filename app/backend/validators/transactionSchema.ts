import { z } from 'zod';

export const transactionRequestSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  tx_type: z.enum(['swap', 'transfer', 'payment', 'stake'], {
    required_error: 'Transaction type is required',
  }),
  amount: z.number().positive('Amount must be positive'),
  token: z.string().min(1, 'Token is required').default('SOL'),
  recipient: z.string().optional(),
  task_id: z.string().optional(),
  work_proof: z.string().optional(),
  chain: z.string().default('solana'),
});

export const trustgateQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['passed', 'blocked']).optional(),
  agent_id: z.string().uuid().optional(),
});

export type TransactionRequestInput = z.infer<typeof transactionRequestSchema>;
export type TrustgateQuery = z.infer<typeof trustgateQuerySchema>;
