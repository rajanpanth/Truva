'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-[#555] hover:text-[#00ff88] ${className ?? ''}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-[#00ff88]" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
