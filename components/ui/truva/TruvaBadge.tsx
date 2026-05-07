type BadgeVariant = 'gold' | 'silver' | 'bronze' | 'trading' | 'security';

const badgeColors: Record<BadgeVariant, string> = {
  gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)',
  bronze: 'var(--tier-bronze)',
  trading: 'var(--blue)',
  security: 'var(--amber)',
};

interface TruvaBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export function TruvaBadge({ variant, label, className = '' }: TruvaBadgeProps) {
  const color = badgeColors[variant];
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[12px] uppercase tracking-[1px] font-mono font-medium rounded-[2px] ${className}`}
      style={{ border: `1px solid ${color}`, color }}
    >
      {label ?? variant.toUpperCase()}
    </span>
  );
}
