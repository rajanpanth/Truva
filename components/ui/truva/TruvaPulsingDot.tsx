interface TruvaPulsingDotProps {
  color?: string;
  size?: number;
  className?: string;
}

export function TruvaPulsingDot({
  color = 'var(--accent-green)',
  size = 6,
  className = '',
}: TruvaPulsingDotProps) {
  return (
    <span
      className={`inline-block rounded-full animate-truva-pulse ${className}`}
      style={{ width: size, height: size, background: color }}
    />
  );
}
