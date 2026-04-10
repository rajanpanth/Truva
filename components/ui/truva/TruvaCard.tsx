import { ReactNode } from 'react';

interface TruvaCardProps {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}

export function TruvaCard({ children, className = '', highlight }: TruvaCardProps) {
  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 ${highlight ? 'border-[var(--accent-green)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
