import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { wallet, agent_id, agent_name, amount_sol, cap_usd, duration, tx_sig } = body;

    if (!wallet || !agent_id || !agent_name || amount_sol == null || cap_usd == null || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('delegations')
      .insert({
        wallet,
        agent_id,
        agent_name,
        amount_sol: parseFloat(amount_sol),
        cap_usd: parseFloat(cap_usd),
        duration,
        tx_sig: tx_sig || null,
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
