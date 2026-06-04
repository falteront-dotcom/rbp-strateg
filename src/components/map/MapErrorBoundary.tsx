'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary that catches mapbox-gl "Invalid LngLat (NaN, ...)" errors
 * during initialization. These errors are recoverable — the map works fine
 * after init — but if uncaught they crash the entire React tree.
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging but don't crash
    console.warn('[MapErrorBoundary] Caught map init error:', error.message);
    console.warn('[MapErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="w-full h-full bg-tactical-bg flex items-center justify-center">
          <div className="text-tactical-primary font-mono text-sm opacity-60">
            Карта недоступна — ошибка инициализации
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
