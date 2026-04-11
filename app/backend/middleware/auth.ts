import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/backend/supabase/server';

const API_KEY_HEADER = 'x-api-key';
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

/**
 * Rate-limit middleware. Apply to all routes.
 * Returns null if allowed, or a NextResponse if blocked.
 */
export function withRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIP(request);
  const key = `${ip}:${request.nextUrl.pathname}`;
  const { allowed, remaining } = checkRateLimit(key);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Rate limit headers will be set by the actual handler
  // Store remaining in a way handlers can access
  request.headers.set('x-ratelimit-remaining', String(remaining));
  return null;
}

/**
 * Auth middleware for write endpoints.
 * Checks for a valid API key in the x-api-key header.
 * Returns null if authenticated, or a NextResponse if rejected.
 */
export function withAuth(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get(API_KEY_HEADER);
  const expectedKey = process.env.TRUVA_API_KEY;

  // If no API key is configured, block all write requests in production
  if (!expectedKey) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Server misconfiguration: API key not set' },
        { status: 500 }
      );
    }
    // In development, allow requests without API key
    return null;
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Authentication required. Provide x-api-key header.' },
      { status: 401 }
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (apiKey.length !== expectedKey.length) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 403 }
    );
  }

  let mismatch = 0;
  for (let i = 0; i < apiKey.length; i++) {
    mismatch |= apiKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Combined middleware: rate limit + auth for write endpoints.
 */
export function withProtection(request: NextRequest): NextResponse | null {
  const rateLimitResult = withRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const authResult = withAuth(request);
  if (authResult) return authResult;

  return null;
}
