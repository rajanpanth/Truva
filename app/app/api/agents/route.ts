import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';
import { withRateLimit } from '@/backend/middleware/auth';

export const dynamic = 'force-dynamic';
import { agentQuerySchema } from '@/backend/validators/agentSchema';
import { registerAgentFullSchema, registerAuthSchema } from '@/backend/validators/registerSchema';
import { verifyRegisterSignature } from '@/backend/auth/verifyRegisterSignature';
import { deriveAgentPDA } from '@/lib/solana/pda';
import { toPublicAgent, type Agent } from '@/backend/types/agent';

export async function GET(request: NextRequest) {
  const rateLimited = withRateLimit(request);
  if (rateLimited) return rateLimited;
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

    return NextResponse.json({ data: (data as Agent[]).map(toPublicAgent) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = withRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    // Registration must be authorised by a wallet signature over the canonical
    // message (see lib/auth/registerMessage.ts): wallet = base58 address,
    // signature = base64 ed25519 signature, timestamp = ISO-8601 UTC.
    const auth = registerAuthSchema.safeParse(body);
    if (!auth.success) {
      return NextResponse.json(
        {
          error:
            'Wallet signature required: provide wallet (base58), signature (base64) and timestamp (ISO-8601) for the signed registration message.',
          details: auth.error.flatten(),
        },
        { status: 401 }
      );
    }

    const parsed = registerAgentFullSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const verified = verifyRegisterSignature({
      publicKey: input.public_key,
      wallet: auth.data.wallet,
      signature: auth.data.signature,
      timestamp: auth.data.timestamp,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    const supabase = createServerClient();
    const rawBody = body as Record<string, unknown>;
    const txSignature = typeof rawBody.tx_signature === 'string' ? rawBody.tx_signature : null;
    const pdaAddress = deriveAgentPDA(input.public_key);
    const rawMetadata: unknown = input.metadata && input.metadata.trim() !== ''
      ? JSON.parse(input.metadata)
      : {};
    const parsedMetadata: Record<string, unknown> =
      rawMetadata !== null && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
        ? { ...(rawMetadata as Record<string, unknown>) }
        : {};
    if (txSignature) parsedMetadata.tx_signature = txSignature;
    // Always server-set: the wallet that proved control by signing. Never trust a client-supplied value.
    parsedMetadata.registered_by = auth.data.wallet;

    const agentRow = {
      name: input.name,
      public_key: input.public_key,
      operator_name: input.operator_name,
      operator_email: input.operator_email,
      description: input.description ?? null,
      task_type: input.task_type,
      trust_score: 50,
      tier: 1,
      max_tx_size: input.max_tx_size,
      rate_limit: input.rate_limit,
      chains: input.chains,
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
      // Duplicate public_key → 409 Conflict
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'WALLET_ALREADY_REGISTERED' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toPublicAgent(data as Agent) }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/agents] error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
