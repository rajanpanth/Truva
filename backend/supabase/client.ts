import { createBrowserClient as _createBrowserClient } from '@supabase/ssr';

function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof _createBrowserClient> | null = null;

export const isSupabaseConfigured =
  isValidUrl(SUPABASE_URL) && !!SUPABASE_ANON_KEY;

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
  if (!_client) {
    _client = _createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return _client;
}

export const createBrowserClient = createClient;
