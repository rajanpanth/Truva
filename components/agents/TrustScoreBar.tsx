'use client';

interface TrustScoreBarProps {
  score: number;
  showLabel?: boolean;
  height?: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return '#00ff88';
  if (score >= 50) return '#ffcc00';
  return '#ff4444';
}

export function TrustScoreBar({ score, showLabel = true, height = 6 }: TrustScoreBarProps) {
  const color = getScoreColor(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 overflow-hidden bg-[#1a1a1a]"
        style={{ height }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${clampedScore}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-[13px]" style={{ color }}>
          {clampedScore}
        </span>
      )}
    </div>
  );
}
