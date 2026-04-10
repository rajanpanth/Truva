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
    <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)]">
          {label}
        </span>
        {icon && <span className="text-[var(--accent-green)]">{icon}</span>}
      </div>
      <div
        className="text-[28px] font-bold leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {sub && (
        <p className="mt-2 text-[10px] uppercase tracking-[2px]" style={{ color: subColor }}>
          {sub}
        </p>
      )}
    </div>
  );
}
