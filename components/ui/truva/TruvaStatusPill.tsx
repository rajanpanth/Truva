type PillVariant =
  | 'passed' | 'blocked' | 'pending' | 'verified' | 'rejected'
  | 'active' | 'standby' | 'online' | 'offline' | 'flagged'
  | 'live' | 'synced'
  | 'gold' | 'silver' | 'bronze';

interface TruvaStatusPillProps {
  variant: PillVariant;
  label?: string;
  className?: string;
}

const config: Record<PillVariant, { border: string; text: string; bg: string; dot?: string }> = {
  passed:   { border: 'var(--accent-green)', text: 'var(--accent-green)', bg: 'transparent' },
  blocked:  { border: 'var(--red)', text: 'var(--red)', bg: 'transparent' },
  pending:  { border: '#666666', text: '#666666', bg: 'transparent' },
  verified: { border: 'var(--accent-green)', text: '#000000', bg: 'var(--accent-green)' },
  rejected: { border: 'var(--red)', text: 'var(--red)', bg: 'transparent' },
  active:   { border: 'transparent', text: 'var(--accent-green)', bg: 'transparent', dot: 'var(--accent-green)' },
  standby:  { border: 'transparent', text: '#666666', bg: 'transparent', dot: '#666666' },
  online:   { border: 'transparent', text: 'var(--accent-green)', bg: 'transparent', dot: 'var(--accent-green)' },
  offline:  { border: 'transparent', text: '#666666', bg: 'transparent', dot: '#666666' },
  flagged:  { border: 'transparent', text: 'var(--red)', bg: 'transparent', dot: 'var(--red)' },
  live:     { border: 'var(--accent-green)', text: 'var(--accent-green)', bg: 'transparent', dot: 'var(--accent-green)' },
  synced:   { border: 'transparent', text: 'var(--accent-green)', bg: 'transparent' },
  gold:     { border: 'var(--tier-gold)', text: 'var(--tier-gold)', bg: 'transparent' },
  silver:   { border: 'var(--tier-silver)', text: 'var(--tier-silver)', bg: 'transparent' },
  bronze:   { border: 'var(--tier-bronze)', text: 'var(--tier-bronze)', bg: 'transparent' },
};

const labels: Record<PillVariant, string> = {
  passed: 'PASSED', blocked: 'BLOCKED', pending: 'PENDING',
  verified: 'VERIFIED', rejected: 'REJECTED', active: 'ACTIVE',
  standby: 'STANDBY', online: 'ONLINE', offline: 'OFFLINE',
  flagged: 'FLAGGED', live: 'LIVE', synced: 'SYNCED',
  gold: 'GOLD', silver: 'SILVER', bronze: 'BRONZE',
};

export function TruvaStatusPill({ variant, label, className = '' }: TruvaStatusPillProps) {
  const c = config[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[12px] uppercase tracking-[2px] font-mono font-medium rounded-[2px] ${className}`}
      style={{
        border: c.border !== 'transparent' ? `1px solid ${c.border}` : 'none',
        color: c.text,
        background: c.bg,
      }}
    >
      {c.dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${variant === 'live' ? 'animate-truva-pulse' : ''}`}
          style={{ background: c.dot }}
        />
      )}
      {label ?? labels[variant]}
    </span>
  );
}
