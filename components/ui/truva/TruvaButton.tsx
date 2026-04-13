'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'outlined' | 'ghost' | 'danger';

interface TruvaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-[var(--accent-green)] text-[#000000] hover:bg-[var(--accent-green-hover)]',
  outlined:
    'bg-transparent border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green-dim)]',
  ghost:
    'bg-transparent border border-[var(--text-dim)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]',
  danger:
    'bg-[var(--red)] text-[#ffffff] hover:brightness-110',
};

export const TruvaButton = forwardRef<HTMLButtonElement, TruvaButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[13px] uppercase tracking-[2px] font-mono font-medium rounded-[2px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);
TruvaButton.displayName = 'TruvaButton';
