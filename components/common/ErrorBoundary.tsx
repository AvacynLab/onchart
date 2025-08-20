'use client';

import React from 'react';

/**
 * Generic error boundary used around interactive client components such as the
 * chat interface or the artifact viewer. When a child throws, the boundary
 * displays a small fallback so tests can assert on failures without the UI
 * collapsing silently.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Surface the error in the console for easier debugging while ensuring the
    // application continues to render.
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="ui-error">Something went wrong.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

