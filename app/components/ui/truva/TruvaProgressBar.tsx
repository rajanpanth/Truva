interface TruvaProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  height?: number;
}

export function TruvaProgressBar({
  value,
  max = 100,
  className = '',
  color = 'var(--accent-green)',
  height = 3,
}: TruvaProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`w-full bg-[var(--border-default)] rounded-none ${className}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-none transition-all duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
