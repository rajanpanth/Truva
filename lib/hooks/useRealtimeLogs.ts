'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrustGateLog } from '@/types/trustgate';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export function useRealtimeLogs(limit = 20) {
  const [logs, setLogs] = useState<TrustGateLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const addLog = useCallback((payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
    const newLog = payload.new as unknown as TrustGateLog;
    setLogs((prev) => [newLog, ...prev].slice(0, limit));
  }, [limit]);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial logs
    supabase
      .from('trustgate_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setLogs(data as unknown as TrustGateLog[]);
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
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, addLog]);

  return { logs, isConnected };
}
