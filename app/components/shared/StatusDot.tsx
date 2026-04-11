'use client';

interface StatusDotProps {
  status: 'active' | 'flagged' | 'inactive' | 'online' | 'standby';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-[#00ff88]',
  online: 'bg-[#00ff88]',
  flagged: 'bg-[#ff4444]',
  inactive: 'bg-[#555]',
  standby: 'bg-yellow-500',
};

const sizeMap: Record<string, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-3 w-3',
};

export function StatusDot({ status, size = 'md', pulse = true }: StatusDotProps) {
  const color = statusColors[status] ?? 'bg-[#555]';
  const sizeClass = sizeMap[size];
  const shouldPulse = pulse && (status === 'active' || status === 'online');

  return (
    <span className="relative inline-flex">
      {shouldPulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sizeClass} ${color}`} />
    </span>
  );
}
