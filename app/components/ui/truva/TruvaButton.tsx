'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'outlined' | 'ghost' | 'danger';

interface TruvaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-[var(--accent-green)] text-black font-bold shadow-[0_0_16px_var(--accent-green-glow)] hover:bg-[var(--accent-green-hover)] hover:shadow-[0_0_28px_rgba(0,232,122,0.3)] active:scale-[0.98]',
  outlined:
    'bg-transparent border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green-dim)] hover:shadow-[0_0_16px_var(--accent-green-glow)] active:scale-[0.98]',
  ghost:
    'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)]',
  danger:
    'bg-[var(--red)] text-white shadow-[0_0_12px_rgba(240,54,54,0.2)] hover:brightness-110 active:scale-[0.98]',
};

export const TruvaButton = forwardRef<HTMLButtonElement, TruvaButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[12px] uppercase tracking-[2px] font-mono font-medium rounded-md transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);
TruvaButton.displayName = 'TruvaButton';
