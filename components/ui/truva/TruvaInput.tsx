'use client';
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface TruvaInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightElement?: ReactNode;
}

export const TruvaInput = forwardRef<HTMLInputElement, TruvaInputProps>(
  ({ label, rightElement, className = '', ...props }, ref) => (
    <div className={className}>
      {label && (
        <label className="block mb-2 text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-2.5 text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-green)] focus:outline-none transition-colors"
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  ),
);
TruvaInput.displayName = 'TruvaInput';
