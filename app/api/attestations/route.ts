import { NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('reputation_events')
      .select('id, agent_id, event_type, description, score_delta, created_at, agents(name)')
      .eq('event_type', 'attested')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const attestations = (data ?? []).map((row) => ({
      id: row.id,
      agent_id: row.agent_id,
      agent_name: (row.agents as { name?: string } | null)?.name ?? row.agent_id?.slice(0, 10) ?? 'Unknown',
      score_delta: row.score_delta,
      description: row.description,
      created_at: row.created_at,
    }));

    return NextResponse.json({ data: attestations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
