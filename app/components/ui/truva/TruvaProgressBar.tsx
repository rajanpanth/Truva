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
  height = 4,
}: TruvaProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`w-full bg-[var(--border-subtle)] rounded-full ${className}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: pct > 0 ? `0 0 8px ${color}55` : 'none',
        }}
      />
    </div>
  );
}
