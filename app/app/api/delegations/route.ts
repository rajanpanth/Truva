import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/backend/supabase/server';
import { withRateLimit } from '@/backend/middleware/auth';
import { verifyDelegationSignature } from '@/backend/auth/verifyDelegationSignature';

export const dynamic = 'force-dynamic';

const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** A Solana transaction signature is 64 bytes: 86-88 base58 characters. */
const txSigRegex = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
/** Single-line values only: these go into the signed message, one per line. */
const singleLine = /^[^\r\n]+$/;

/**
 * Wallet-signature proof required by POST /api/delegations.
 * See lib/auth/delegationMessage.ts for the canonical message and encodings.
 */
const delegationAuthSchema = z.object({
  wallet: z.string().regex(base58Regex, 'wallet must be a base58 Solana address'),
  signature: z.string().min(1, 'signature is required').max(128),
  timestamp: z.string().min(1, 'timestamp is required').max(40),
});

const numeric = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
  z.number().finite().nonnegative()
);

const delegationSchema = z.object({
  agent_id: z.string().min(1).max(128).regex(singleLine, 'agent_id must be a single line'),
  agent_name: z.string().min(1).max(128),
  amount_sol: numeric,
  cap_usd: numeric,
  duration: z.string().min(1).max(32),
  tx_sig: z.string().regex(txSigRegex, 'tx_sig must be a base58 transaction signature').nullish(),
});

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

    // Recording a delegation must be authorised by a wallet signature over the
    // canonical message (see lib/auth/delegationMessage.ts): wallet = base58
    // address, signature = base64 ed25519 signature, timestamp = ISO-8601 UTC.
    const auth = delegationAuthSchema.safeParse(body);
    if (!auth.success) {
      return NextResponse.json(
        {
          error:
            'Wallet signature required: provide wallet (base58), signature (base64) and timestamp (ISO-8601) for the signed delegation message.',
          details: auth.error.flatten(),
        },
        { status: 401 }
      );
    }

    const parsed = delegationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Missing or invalid fields', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const txSig = input.tx_sig || null;

    const verified = verifyDelegationSignature({
      agentId: input.agent_id,
      wallet: auth.data.wallet,
      txSig,
      signature: auth.data.signature,
      timestamp: auth.data.timestamp,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('delegations')
      .insert({
        // Always the wallet that proved control by signing; the signed message
        // binds it, so no other client-supplied wallet can end up in the row.
        wallet: auth.data.wallet,
        agent_id: input.agent_id,
        agent_name: input.agent_name,
        amount_sol: input.amount_sol,
        cap_usd: input.cap_usd,
        duration: input.duration,
        tx_sig: txSig,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/delegations] error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/delegations] error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
