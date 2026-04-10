export default function PlatformLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]" />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_360px] gap-6">
        <div className="h-[320px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]" />
        <div className="h-[320px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]" />
      </div>
      <div className="h-48 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]" />
    </div>
  );
}
