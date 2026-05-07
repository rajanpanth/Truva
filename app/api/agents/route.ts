import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';
import { withRateLimit } from '@/backend/middleware/auth';

export const dynamic = 'force-dynamic';
import { agentQuerySchema } from '@/backend/validators/agentSchema';
import { registerAgentFullSchema } from '@/backend/validators/registerSchema';
import { deriveAgentPDA } from '@/lib/solana/pda';
import type { Agent } from '@/backend/types/agent';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;

    const parsed = agentQuerySchema.safeParse({
      tier: searchParams.get('tier') ?? undefined,
      task_type: searchParams.get('task_type') ?? undefined,
      is_active: searchParams.get('is_active') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;
    let query = supabase.from('agents').select('*');

    if (filters.tier !== undefined) {
      query = query.eq('tier', filters.tier);
    }
    if (filters.task_type !== undefined) {
      query = query.eq('task_type', filters.task_type);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,public_key.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query.order('registered_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Agent[] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = createServerClient();
    const body: unknown = await request.json();

    const parsed = registerAgentFullSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const rawBody = body as Record<string, unknown>;
    const txSignature = typeof rawBody.tx_signature === 'string' ? rawBody.tx_signature : null;
    // Derive the real PDA from the agent's public key (same seeds as the Anchor program)
    const pdaAddress = deriveAgentPDA(input.public_key);
    const parsedMetadata = input.metadata && input.metadata.trim() !== ''
      ? JSON.parse(input.metadata)
      : {};
    if (txSignature) parsedMetadata.tx_signature = txSignature;

    // trust_score 50 maps to tier 2 (Silver) per: Bronze<50, Silver 50-79, Gold 80+
    const trustScore = 50;
    const tier = trustScore >= 80 ? 3 : trustScore >= 50 ? 2 : 1;

    const agentRow = {
      name: input.name,
      public_key: input.public_key,
      operator_name: input.operator_name,
      operator_email: input.operator_email,
      description: input.description ?? null,
      task_type: input.task_type,
      trust_score: trustScore,
      tier,
      max_tx_size: input.max_tx_size,
      rate_limit: input.rate_limit,
      chains: input.chains,
      spending_behavior: input.spending_behavior ?? 'standard',
      tasks_completed: 0,
      tasks_failed: 0,
      success_rate: 100,
      is_active: true,
      is_flagged: false,
      pda_address: pdaAddress,
      metadata: parsedMetadata,
    };

    const { data, error } = await supabase
      .from('agents')
      .insert(agentRow)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger reputation engine backfill asynchronously (best-effort)
    const reputationEngineUrl = process.env.REPUTATION_ENGINE_URL;
    if (reputationEngineUrl && input.public_key) {
      fetch(`${reputationEngineUrl}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubkey: input.public_key }),
      }).catch((err) => console.warn('Reputation engine registration failed (non-fatal):', err));
    }

    return NextResponse.json({ data: data as Agent }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
