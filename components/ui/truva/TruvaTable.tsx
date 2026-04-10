import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TruvaTableProps {
  columns: Column[];
  data: Record<string, ReactNode>[];
  className?: string;
  onRowClick?: (row: Record<string, ReactNode>, idx: number) => void;
}

export function TruvaTable({ columns, data, className = '', onRowClick }: TruvaTableProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-[10px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium text-${col.align ?? 'left'}`}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--border-subtle)] h-[44px] hover:bg-[var(--bg-card)] transition-colors cursor-default"
              onClick={() => onRowClick?.(row, i)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 text-[13px] text-${col.align ?? 'left'}`}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
