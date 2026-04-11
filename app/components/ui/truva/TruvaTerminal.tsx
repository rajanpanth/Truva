'use client';

interface TerminalLine {
  timestamp?: string;
  tag?: string;
  content: string;
}

const tagColors: Record<string, string> = {
  INFO: 'var(--text-secondary)',
  AUTH: 'var(--accent-green)',
  TX: 'var(--blue)',
  SYS: 'var(--purple)',
  WARN: 'var(--amber)',
  HB: 'var(--text-secondary)',
  LIVE: 'var(--accent-green)',
  ALERT: 'var(--red)',
  ACTION: 'var(--red)',
  SYSTEM: 'var(--text-secondary)',
  INBOUND: 'var(--accent-green)',
  RECOVERY: 'var(--accent-green)',
  WAITING: 'var(--text-muted)',
  SCAN: 'var(--amber)',
};

function renderTag(tag: string) {
  const color = tagColors[tag] || 'var(--text-secondary)';
  if (tag === 'ALERT' || tag === 'ACTION') {
    return (
      <span
        className="inline-block px-1.5 py-0 text-[11px] rounded-[2px] font-bold"
        style={{ background: color, color: '#ffffff' }}
      >
        {tag}
      </span>
    );
  }
  return (
    <span style={{ color }} className="font-bold">
      [{tag}]
    </span>
  );
}

function parseLine(input: string | TerminalLine): TerminalLine {
  if (typeof input !== 'string') return input;
  const match = input.match(/^\[([A-Z_]+)\]\s*(.*)/);
  if (match) return { tag: match[1], content: match[2] };
  return { content: input };
}

interface TruvaTerminalProps {
  lines: (string | TerminalLine)[];
  title?: string;
  className?: string;
  showCursor?: boolean;
  maxHeight?: string;
}

export function TruvaTerminal({ lines, title, className = '', showCursor, maxHeight }: TruvaTerminalProps) {
  const parsed = lines.map(parseLine);
  return (
    <div className={`bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px] font-mono text-[12px] ${className}`}>
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)]">
            {title}
          </span>
        </div>
      )}
      <div className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: maxHeight || '400px' }}>
        {parsed.map((line, i) => (
          <div key={i} className="flex gap-2 leading-[1.8]">
            {line.timestamp && (
              <span className="text-[var(--text-muted)] shrink-0">{line.timestamp}</span>
            )}
            {line.tag && renderTag(line.tag)}
            <span className="text-[var(--text-secondary)]">{line.content}</span>
          </div>
        ))}
        {showCursor && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[var(--accent-green)]">{'>'}</span>
            <span className="w-2 h-4 bg-[var(--accent-green)] animate-terminal-blink" />
          </div>
        )}
      </div>
    </div>
  );
}
