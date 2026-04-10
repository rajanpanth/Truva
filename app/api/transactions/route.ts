import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';

export const dynamic = 'force-dynamic';
import type { Transaction } from '@/backend/types/transaction';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');

    let countQuery = supabase.from('transactions').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentId) {
      countQuery = countQuery.eq('agent_id', agentId);
      dataQuery = dataQuery.eq('agent_id', agentId);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
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
      data: (data ?? []) as Transaction[],
      total: count ?? 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
