'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="text-[13px] font-mono text-red-500 tracking-widest mb-3">SYSTEM_ERROR</div>
          <p className="text-[13px] text-zinc-400 max-w-md mb-4">
            Something went wrong rendering this section.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-[12px] font-mono font-bold text-black bg-[#14F195] hover:bg-[#14F195]/90 transition-colors"
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
