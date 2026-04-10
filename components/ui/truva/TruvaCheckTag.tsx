interface TruvaCheckTagProps {
  label: string;
  className?: string;
}

export function TruvaCheckTag({ label, className = '' }: TruvaCheckTagProps) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-[1px] font-mono border border-[var(--border-default)] text-[var(--text-secondary)] rounded-[2px] ${className}`}
    >
      {label}
    </span>
  );
}
