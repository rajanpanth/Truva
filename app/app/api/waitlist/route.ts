import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Config ──
const IS_VERCEL = !!process.env.VERCEL;
const WAITLIST_FILE = IS_VERCEL
  ? path.join(os.tmpdir(), 'truva-waitlist.json')
  : path.join(process.cwd(), 'waitlist.json');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// In-memory fallback for serverless (persists within warm instances)
let memoryWaitlist: WaitlistEntry[] = [];

// ── Waitlist Storage ──

interface WaitlistEntry {
  email: string;
  name: string;
  twitter: string;
  role: string;
  joinedAt: string;
}

function readWaitlist(): { entries: WaitlistEntry[] } {
  try {
    const data = fs.readFileSync(WAITLIST_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    memoryWaitlist = parsed.entries || [];
    return parsed;
  } catch {
    return { entries: [...memoryWaitlist] };
  }
}

function writeWaitlist(data: { entries: WaitlistEntry[] }) {
  memoryWaitlist = data.entries;
  try {
    fs.writeFileSync(WAITLIST_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Silently fail on read-only filesystems — data is in memory + emails go out
    console.log('⚠️  Filesystem write failed — using in-memory store');
  }
}

// ── Email Templates ──

function confirmationEmail(name: string, position: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Courier New',monospace;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    
    <div style="margin-bottom:32px;">
      <span style="color:#14F195;font-size:12px;font-weight:bold;letter-spacing:3px;">● TRUVA PROTOCOL</span>
    </div>
    
    <h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 4px 0;letter-spacing:-0.5px;">
      YOU'RE IN,
    </h1>
    <h2 style="color:#14F195;font-size:28px;font-weight:900;margin:0 0 24px 0;letter-spacing:-0.5px;">
      ${name.toUpperCase()}
    </h2>
    
    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:20px;margin-bottom:24px;">
      <div style="color:#555;font-size:12px;margin-bottom:8px;">$ truva waitlist --status</div>
      <div style="color:#14F195;font-size:13px;">✓ REGISTRATION_CONFIRMED</div>
      <div style="color:#999;font-size:13px;margin-top:4px;">QUEUE_POSITION: #${String(position).padStart(4, '0')}</div>
      <div style="color:#555;font-size:13px;margin-top:4px;">ETA: MAINNET_LAUNCH_Q3_2026</div>
    </div>
    
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
      You've secured your spot on the Truva Protocol early access list. 
      We're building the trust infrastructure for AI agent payments on Solana — 
      and you'll be among the first to use it.
    </p>
    
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 32px 0;">
      We'll reach out when it's your turn to access the SDK and start 
      trust-gating agent payments.
    </p>
    
    <a href="https://www.truva-x.tech" style="display:inline-block;background:#14F195;color:#000;padding:12px 32px;font-size:12px;font-weight:bold;letter-spacing:2px;text-decoration:none;">
      EXPLORE TRUVA →
    </a>
    
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
      <span style="color:#333;font-size:11px;letter-spacing:2px;">TRUVA PROTOCOL · SOLANA</span>
    </div>
  </div>
</body>
</html>`;
}

function notificationEmail(entry: WaitlistEntry, position: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Courier New',monospace;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    
    <div style="margin-bottom:24px;">
      <span style="color:#14F195;font-size:12px;font-weight:bold;letter-spacing:3px;">● NEW WAITLIST SIGNUP</span>
    </div>
    
    <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0 0 24px 0;">
      Waitlist Entry #${position}
    </h1>
    
    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:20px;margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        <span style="color:#555;font-size:11px;letter-spacing:2px;">NAME</span><br>
        <span style="color:#fff;font-size:14px;font-weight:bold;">${entry.name || 'Not provided'}</span>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color:#555;font-size:11px;letter-spacing:2px;">EMAIL</span><br>
        <span style="color:#14F195;font-size:14px;">${entry.email}</span>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color:#555;font-size:11px;letter-spacing:2px;">TWITTER / X</span><br>
        <span style="color:#999;font-size:14px;">${entry.twitter || 'Not provided'}</span>
      </div>
      <div>
        <span style="color:#555;font-size:11px;letter-spacing:2px;">JOINED</span><br>
        <span style="color:#999;font-size:14px;">${entry.joinedAt}</span>
      </div>
    </div>
    
    <p style="color:#666;font-size:13px;">
      Total waitlist: <strong style="color:#14F195;">${position}</strong> operators
    </p>
    
  </div>
</body>
</html>`;
}

// ── Send Emails (non-blocking) ──

async function sendEmails(entry: WaitlistEntry, position: number) {
  if (!resend) {
    console.log('⚠️  RESEND_API_KEY not set — skipping emails');
    return;
  }

  // 1. Confirmation to user
  try {
    await resend.emails.send({
      from: 'Truva Protocol <onboarding@resend.dev>',
      to: entry.email,
      subject: `You're #${position} on the Truva waitlist`,
      html: confirmationEmail(entry.name || 'Operator', position),
    });
    console.log(`✅ Confirmation email sent to ${entry.email}`);
  } catch (err) {
    console.error('❌ Failed to send confirmation:', err);
  }

  // 2. Notification to you
  if (NOTIFY_EMAIL) {
    try {
      await resend.emails.send({
        from: 'Truva Waitlist <onboarding@resend.dev>',
        to: NOTIFY_EMAIL,
        subject: `[Truva] New signup #${position}: ${entry.name || entry.email}`,
        html: notificationEmail(entry, position),
      });
      console.log(`✅ Notification sent to ${NOTIFY_EMAIL}`);
    } catch (err) {
      console.error('❌ Failed to send notification:', err);
    }
  }
}

// ── API Routes ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, twitter, role } = body;

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

    const waitlist = readWaitlist();

    if (waitlist.entries.some((e) => e.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Already on the waitlist' },
        { status: 409 }
      );
    }

    const entry: WaitlistEntry = {
      email: email.toLowerCase().trim(),
      name: (name || '').trim(),
      twitter: (twitter || '').trim(),
      role: role || 'EARLY_ACCESS',
      joinedAt: new Date().toISOString(),
    };

    waitlist.entries.push(entry);
    writeWaitlist(waitlist);

    const position = waitlist.entries.length;

    // Send emails in background (don't block the response)
    sendEmails(entry, position).catch(console.error);

    return NextResponse.json({
      success: true,
      data: {
        position,
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
