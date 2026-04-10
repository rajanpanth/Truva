'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/backend/supabase/client';
import { TrustGateLog } from '@/backend/types/trustgate';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export function useRealtimeLogs(limit = 20) {
  const [logs, setLogs] = useState<TrustGateLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addLog = useCallback((payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
    const newLog = payload.new as unknown as TrustGateLog;
    setLogs((prev) => [newLog, ...prev].slice(0, limit));
  }, [limit]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();

    // Fetch initial logs
    supabase
      .from('trustgate_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }: { data: unknown[] | null }) => {
        if (data) setLogs(data as TrustGateLog[]);
      });

    // Subscribe to realtime
    const channel = supabase
      .channel('trustgate-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trustgate_logs',
        },
        addLog
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, addLog]);

  return { logs, isConnected };
}
