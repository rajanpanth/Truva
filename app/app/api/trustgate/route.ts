import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';

export const dynamic = 'force-dynamic';
import { trustgateQuerySchema } from '@/backend/validators/transactionSchema';
import type { TrustGateLog } from '@/backend/types/trustgate';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;

    const parsed = trustgateQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      agent_id: searchParams.get('agent_id') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, offset, status, agent_id } = parsed.data;

    let countQuery = supabase.from('trustgate_logs').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('trustgate_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }
    if (agent_id) {
      countQuery = countQuery.eq('agent_id', agent_id);
      dataQuery = dataQuery.eq('agent_id', agent_id);
    }

    const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countError || dataError) {
      return NextResponse.json(
        { error: countError?.message ?? dataError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: (data ?? []) as TrustGateLog[],
      total: count ?? 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
