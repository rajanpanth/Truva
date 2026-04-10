'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/backend/supabase/client';
import { truncateAddress, formatAmount, formatTimeAgo } from '@/backend/utils/formatters';
import type { Transaction } from '@/backend/types/transaction';

export function PaymentHistory() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Transaction[];
    },
    refetchInterval: 10000,
  });

  return (
    <div className="rounded border border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="border-b border-[#1a1a1a] px-4 py-3">
        <span className="font-mono text-[10px] tracking-widest text-[#555]">PAYMENT_HISTORY</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {['AGENT', 'TYPE', 'AMOUNT', 'STATUS', 'TIME'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-[10px] tracking-widest text-[#444]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-3 w-16 animate-pulse rounded bg-[#1a1a1a]" />
                      </td>
                    ))}
                  </tr>
                ))
              : transactions?.map((tx) => {
                  const colors: Record<string, string> = {
                    completed: 'text-[#00ff88]',
                    pending: 'text-yellow-500',
                    failed: 'text-[#ff4444]',
                    blocked: 'text-[#ff4444]',
                  };
                  return (
                    <tr key={tx.id} className="border-b border-[#1a1a1a] hover:bg-[#111]">
                      <td className="px-4 py-2 font-mono text-[10px] text-white">{truncateAddress(tx.agent_id)}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-[#555]">{tx.tx_type}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-white">{formatAmount(tx.amount)}</td>
                      <td className={`px-4 py-2 font-mono text-[10px] font-bold ${colors[tx.status] ?? 'text-[#555]'}`}>
                        {tx.status?.toUpperCase()}
                      </td>
                      <td className="px-4 py-2 font-mono text-[10px] text-[#444]">{formatTimeAgo(tx.created_at)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
