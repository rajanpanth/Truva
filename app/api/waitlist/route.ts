import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WAITLIST_FILE = path.join(process.cwd(), 'waitlist.json');

function readWaitlist(): { entries: { email: string; role: string; joinedAt: string }[] } {
  try {
    const data = fs.readFileSync(WAITLIST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { entries: [] };
  }
}

function writeWaitlist(data: { entries: { email: string; role: string; joinedAt: string }[] }) {
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(data, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const waitlist = readWaitlist();

    // Check for duplicates
    if (waitlist.entries.some((e) => e.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Already on the waitlist' },
        { status: 409 }
      );
    }

    waitlist.entries.push({
      email: email.toLowerCase().trim(),
      role: role || 'DEVELOPER',
      joinedAt: new Date().toISOString(),
    });

    writeWaitlist(waitlist);

    return NextResponse.json({
      success: true,
      data: {
        position: waitlist.entries.length,
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
  const waitlist = readWaitlist();
  return NextResponse.json({
    success: true,
    data: { count: waitlist.entries.length },
  });
}
