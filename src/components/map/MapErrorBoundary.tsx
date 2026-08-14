'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  /** Bumped on retry so children remount with a fresh identity, re-running any
   * side-effectful map init under a new subtree key. */
  retryKey: number;
}

/**
 * ErrorBoundary that catches mapbox-gl "Invalid LngLat (NaN, ...)" errors
 * during initialization. These errors are recoverable — the map works fine
 * after init — but if uncaught they crash the entire React tree.
 *
 * The fallback exposes a "Повторить" (retry) action that clears the error
 * state and remounts the children subtree via `retryKey`, giving the map a
 * fresh initialization attempt without reloading the page. SafeLngLat is
 * intentionally still in place upstream; this boundary is defence-in-depth.
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, retryKey: 0 };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging but don't crash
    console.warn('[MapErrorBoundary] Caught map init error:', error.message);
    console.warn('[MapErrorBoundary] Component stack:', info.componentStack);
  }

  /** Clear the error and force the children to remount with a fresh subtree. */
  private handleReset = () => {
    this.setState((prev) => ({ hasError: false, retryKey: prev.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <MapErrorFallback onRetry={this.handleReset} />;
    }
    // Keyed Fragment remounts the (possibly side-effectful) children subtree
    // on every retry, so a failed map init can be reattempted from scratch.
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}

/** Default recoverable fallback: a localized message plus a retry button. */
function MapErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full h-full bg-tactical-bg flex flex-col items-center justify-center gap-3 font-mono">
      <div className="text-tactical-primary text-sm opacity-60 text-center px-4">
        Карта недоступна — ошибка инициализации
      </div>
      <button
        type="button"
        onClick={onRetry}
        aria-label="Повторить загрузку карты"
        className="px-3 py-1.5 text-[10px] tracking-widest uppercase border border-tactical-primary/40 text-tactical-primary rounded hover:bg-tactical-primary/10 transition-colors cursor-pointer"
      >
        ↻ Повторить
      </button>
    </div>
  );
}