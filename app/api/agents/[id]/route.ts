import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';
import type { Agent } from '@/backend/types/agent';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: data as Agent });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = createServerClient();
    const body: Record<string, unknown> = await request.json();

    const allowedFields = new Set([
      'name',
      'description',
      'task_type',
      'max_tx_size',
      'rate_limit',
      'is_active',
      'is_flagged',
      'chains',
      'metadata',
    ]);

    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (allowedFields.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'Agent not found' },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ data: data as Agent });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
