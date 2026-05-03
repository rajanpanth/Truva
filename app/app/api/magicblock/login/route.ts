import { NextRequest, NextResponse } from 'next/server';

const PER_API = 'https://payments.magicblock.app';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${PER_API}/v1/spl/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
