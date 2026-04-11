import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';
import { transactionRequestSchema } from '@/backend/validators/transactionSchema';
import { runEnforcementEngine } from '@/backend/enforcement/engine';
import { getTierFromScore } from '@/backend/utils/trustScore';
import { withProtection } from '@/backend/middleware/auth';

export const dynamic = 'force-dynamic';
import type { Agent } from '@/backend/types/agent';
import type { TransactionRequest } from '@/backend/types/enforcement';

export async function POST(request: NextRequest) {
  const blocked = withProtection(request);
  if (blocked) return blocked;

  try {
    const supabase = createServerClient();
    const body: unknown = await request.json();

    const parsed = transactionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const txRequest: TransactionRequest = parsed.data;

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', txRequest.agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const typedAgent = agent as Agent;
    const result = await runEnforcementEngine(txRequest, typedAgent);

    const checksPassedNames = Object.entries(result.checks)
      .filter(([, c]) => c.passed)
      .map(([name]) => name);
    const checksFailedNames = Object.entries(result.checks)
      .filter(([, c]) => !c.passed)
      .map(([name]) => name);

    const transactionRow = {
      agent_id: txRequest.agent_id,
      session_id: result.session_id,
      tx_type: txRequest.tx_type,
      amount: txRequest.amount,
      token: txRequest.token,
      recipient: txRequest.recipient ?? null,
      status: result.allowed ? 'passed' : 'blocked',
      block_reason: result.block_reason ?? null,
      latency_ms: result.total_latency_ms,
      checks_passed: checksPassedNames,
      checks_failed: checksFailedNames,
      zk_proof: result.zk_proof ?? null,
      chain: txRequest.chain,
    };

    const { error: txInsertError } = await supabase
      .from('transactions')
      .insert(transactionRow);

    if (txInsertError) {
      return NextResponse.json({ error: txInsertError.message }, { status: 500 });
    }

    const scoreDelta = result.allowed ? 2 : -5;
    const newScore = Math.max(0, Math.min(100, typedAgent.trust_score + scoreDelta));
    const newTier = getTierFromScore(newScore);

    // Recalculate success rate from transaction history
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', txRequest.agent_id);

    const { count: successCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', txRequest.agent_id)
      .eq('status', 'completed');

    const total = (totalCount ?? 0);
    const successes = (successCount ?? 0);
    const successRate = total > 0
      ? Math.round((successes / total) * 10000) / 100
      : 100;

    const { error: agentUpdateError } = await supabase
      .from('agents')
      .update({
        trust_score: newScore,
        tier: newTier,
        success_rate: successRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', txRequest.agent_id);

    if (agentUpdateError) {
      return NextResponse.json({ error: agentUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
