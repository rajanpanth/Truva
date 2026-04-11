import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';
import { calculateScoreDelta, getTierFromScore } from '@/backend/utils/trustScore';
import { withRateLimit, withProtection } from '@/backend/middleware/auth';
import { z } from 'zod';
import type { ReputationEvent } from '@/backend/types/transaction';

export const dynamic = 'force-dynamic';
import type { Agent } from '@/backend/types/agent';

const createReputationEventSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  event_type: z.enum(['task_success', 'task_fail', 'blocked', 'attested'], {
    required_error: 'Event type is required',
  }),
  note: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const agentId = request.nextUrl.searchParams.get('agent_id');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agent_id query parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reputation_events')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as ReputationEvent[] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = withProtection(request);
  if (blocked) return blocked;

  try {
    const supabase = createServerClient();
    const body: unknown = await request.json();

    const parsed = createReputationEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { agent_id, event_type, note } = parsed.data;

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const typedAgent = agent as Agent;
    const scoreDelta = calculateScoreDelta(event_type, typedAgent.trust_score);
    const scoreAfter = Math.max(0, Math.min(100, typedAgent.trust_score + scoreDelta));

    const eventRow = {
      agent_id,
      event_type,
      score_delta: scoreDelta,
      score_after: scoreAfter,
      note: note ?? null,
    };

    const { data: insertedEvent, error: insertError } = await supabase
      .from('reputation_events')
      .insert(eventRow)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const newTier = getTierFromScore(scoreAfter);

    const { error: updateError } = await supabase
      .from('agents')
      .update({
        trust_score: scoreAfter,
        tier: newTier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agent_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: insertedEvent as ReputationEvent }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
