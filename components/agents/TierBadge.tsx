interface TierBadgeProps {
  tier: number;
  className?: string;
}

const TIER_LABELS: Record<number, string> = { 0: 'SANDBOX', 1: 'BRONZE', 2: 'SILVER', 3: 'PLATINUM' };
const TIER_COLORS: Record<number, string> = { 0: '#555', 1: '#cd7f32', 2: '#888', 3: '#00ff88' };

export function TierBadge({ tier, className }: TierBadgeProps) {
  const label = TIER_LABELS[tier] ?? 'UNKNOWN';
  const color = TIER_COLORS[tier] ?? '#555';

  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${className ?? ''}`}
      style={{ color, borderColor: `${color}40` }}
    >
      {label}
    </span>
  );
}
