export default function CoreLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-64 bg-[var(--bg-elevated)] rounded-[2px]" />
          <div className="h-3 w-48 bg-[var(--bg-elevated)] rounded-[2px] mt-2" />
        </div>
        <div className="h-8 w-32 bg-[var(--bg-elevated)] rounded-[2px]" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]" />
        ))}
      </div>
      <div className="h-[400px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]" />
    </div>
  );
}
