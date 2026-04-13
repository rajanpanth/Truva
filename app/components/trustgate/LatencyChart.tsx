'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/backend/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LatencyDataPoint {
  time: string;
  avgLatency: number;
  count: number;
}

export function LatencyChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['latency-chart'],
    queryFn: async () => {
      const supabase = createBrowserClient();
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('trustgate_logs')
        .select('created_at, latency_ms')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const buckets = new Map<string, { total: number; count: number }>();

      for (const log of data ?? []) {
        const date = new Date(log.created_at);
        const minutes = date.getMinutes();
        const bucketMin = Math.floor(minutes / 5) * 5;
        date.setMinutes(bucketMin, 0, 0);
        const key = date.toISOString();

        const existing = buckets.get(key) ?? { total: 0, count: 0 };
        existing.total += log.latency_ms ?? 0;
        existing.count += 1;
        buckets.set(key, existing);
      }

      const result: LatencyDataPoint[] = [];
      Array.from(buckets.entries()).forEach(([time, { total, count }]) => {
        const date = new Date(time);
        result.push({
          time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          avgLatency: Math.round(total / count),
          count,
        });
      });

      return result;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="h-[300px] animate-pulse border border-[#2a3f52] bg-[#0d0d0d]" />
    );
  }

  return (
    <div>
      <div className="mb-3">
        <span className="font-mono text-[13px] uppercase tracking-widest text-[#555]">
          ENFORCEMENT_LATENCY · 60_MIN
        </span>
      </div>

      <div className="border border-[#2a3f52] bg-[#0d0d0d] p-4">
        {!chartData || chartData.length === 0 ? (
          <p className="py-12 text-center font-mono text-[13px] text-[#555]">
            NO_DATA_LAST_60_MIN
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f52" />
              <XAxis
                dataKey="time"
                stroke="#333"
                tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
              />
              <YAxis
                stroke="#333"
                tick={{ fill: '#555', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'ms', position: 'insideLeft', fill: '#555', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d0d0d',
                  border: '1px solid #2a3f52',
                  borderRadius: 0,
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}
                formatter={(value: unknown, name: unknown) => [
                  name === 'avgLatency' ? `${value}ms` : String(value),
                  name === 'avgLatency' ? 'AVG_LATENCY' : 'CHECKS',
                ]}
              />
              <Line
                type="monotone"
                dataKey="avgLatency"
                stroke="#00ff88"
                strokeWidth={2}
                dot={{ fill: '#00ff88', r: 2 }}
                activeDot={{ r: 4, fill: '#00ff88' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
