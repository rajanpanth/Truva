import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PER_API = 'https://payments.magicblock.app';

export async function GET(request: NextRequest) {
  const pubkey = request.nextUrl.searchParams.get('pubkey');
  if (!pubkey) {
    return NextResponse.json({ error: 'pubkey is required' }, { status: 400 });
  }

  // Forward all query params (pubkey, cluster, mock, etc.)
  const upstream = new URL(`${PER_API}/v1/spl/challenge`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  const res = await fetch(upstream.toString());
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
