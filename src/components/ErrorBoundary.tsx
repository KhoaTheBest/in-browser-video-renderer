import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-full w-full flex-col items-center justify-center rounded bg-slate-800 p-6 text-center">
          <p className="mb-2 text-red-400 font-medium">
            Something went wrong in this component.
          </p>
          <pre className="text-xs text-slate-500 bg-slate-900 p-2 rounded max-w-full overflow-x-auto whitespace-pre-wrap">
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            className="mt-4 rounded border border-slate-600 px-3 py-1 text-sm hover:bg-slate-700 text-slate-300"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
