import { ReactNode } from 'react';

interface TruvaStatCardProps {
  label: string;
  value: string | ReactNode;
  sub?: string;
  subColor?: string;
  icon?: ReactNode;
  valueColor?: string;
  className?: string;
}

export function TruvaStatCard({
  label,
  value,
  sub,
  subColor = 'var(--text-secondary)',
  icon,
  valueColor = 'var(--text-primary)',
  className = '',
}: TruvaStatCardProps) {
  return (
    <div className={`card-top-accent relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg overflow-hidden transition-all duration-300 hover:border-[var(--border-hover)] ${className}`}>
      <div className="p-5 pt-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[11px] uppercase tracking-[3px] text-[var(--text-secondary)] font-medium leading-tight">
            {label}
          </span>
          {icon && (
            <div className="w-8 h-8 rounded-md bg-[var(--accent-green-dim)] border border-[var(--accent-green)]/20 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
        </div>
        <div className="text-[32px] font-bold leading-none tabular-nums" style={{ color: valueColor }}>
          {value}
        </div>
        {sub && (
          <p className="mt-2 text-[11px] uppercase tracking-[2px]" style={{ color: subColor }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
