type PillVariant =
  | 'passed' | 'blocked' | 'pending' | 'verified' | 'rejected'
  | 'active' | 'standby' | 'online' | 'offline' | 'flagged' | 'inactive'
  | 'live' | 'synced'
  | 'gold' | 'silver' | 'bronze';

interface TruvaStatusPillProps {
  variant: PillVariant;
  label?: string;
  className?: string;
}

const config: Record<PillVariant, { bg: string; border: string; text: string; dot?: string }> = {
  passed:   { bg: 'rgba(0,232,122,0.1)',   border: 'rgba(0,232,122,0.3)',   text: '#00e87a' },
  blocked:  { bg: 'rgba(240,54,54,0.1)',   border: 'rgba(240,54,54,0.35)',  text: '#f03636' },
  pending:  { bg: 'rgba(100,116,128,0.1)', border: 'rgba(100,116,128,0.2)', text: '#64748b' },
  verified: { bg: 'var(--accent-green)',   border: 'var(--accent-green)',   text: '#000000' },
  rejected: { bg: 'rgba(240,54,54,0.1)',   border: 'rgba(240,54,54,0.35)',  text: '#f03636' },
  active:   { bg: 'rgba(0,232,122,0.08)',  border: 'transparent',           text: '#00e87a', dot: '#00e87a' },
  standby:  { bg: 'transparent',           border: 'transparent',           text: '#6a8799', dot: '#6a8799' },
  inactive: { bg: 'transparent',           border: 'transparent',           text: '#6a8799', dot: '#6a8799' },
  online:   { bg: 'rgba(0,232,122,0.08)',  border: 'transparent',           text: '#00e87a', dot: '#00e87a' },
  offline:  { bg: 'transparent',           border: 'transparent',           text: '#6a8799', dot: '#6a8799' },
  flagged:  { bg: 'rgba(240,54,54,0.08)',  border: 'transparent',           text: '#f03636', dot: '#f03636' },
  live:     { bg: 'rgba(0,232,122,0.1)',   border: 'rgba(0,232,122,0.3)',   text: '#00e87a', dot: '#00e87a' },
  synced:   { bg: 'rgba(0,232,122,0.08)', border: 'transparent',            text: '#00e87a' },
  gold:     { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
  silver:   { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', text: '#94a3b8' },
  bronze:   { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  text: '#f97316' },
};

const labels: Record<PillVariant, string> = {
  passed: 'PASSED', blocked: 'BLOCKED', pending: 'PENDING',
  verified: 'VERIFIED', rejected: 'REJECTED', active: 'ACTIVE',
  standby: 'STANDBY', inactive: 'INACTIVE', online: 'ONLINE', offline: 'OFFLINE',
  flagged: 'FLAGGED', live: 'LIVE', synced: 'SYNCED',
  gold: 'GOLD', silver: 'SILVER', bronze: 'BRONZE',
};

export function TruvaStatusPill({ variant, label, className = '' }: TruvaStatusPillProps) {
  const c = config[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] uppercase tracking-[2px] font-mono font-semibold rounded-md ${className}`}
      style={{
        background: c.bg,
        border: c.border !== 'transparent' ? `1px solid ${c.border}` : 'none',
        color: c.text,
      }}
    >
      {c.dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${variant === 'live' || variant === 'active' || variant === 'online' ? 'animate-truva-pulse' : ''}`}
          style={{ background: c.dot }}
        />
      )}
      {label ?? labels[variant]}
    </span>
  );
}
