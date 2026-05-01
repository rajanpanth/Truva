import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role } = body as { email?: string; role?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicates
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Already on the waitlist' },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabase.from('waitlist').insert({
      email: normalizedEmail,
      role: role || 'DEVELOPER',
    });

    if (insertError) {
      console.error('Waitlist insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      data: {
        position: count ?? 1,
        message: 'Added to waitlist',
      },
    });
  } catch (err) {
    console.error('Waitlist error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });
    return NextResponse.json({
      success: true,
      data: { count: count ?? 0 },
    });
  } catch {
    return NextResponse.json({ success: true, data: { count: 0 } });
  }
}
