'use client';

import React, { useEffect } from 'react';

/**
 * Global error boundary rendered when an uncaught exception bubbles to the app
 * router. It logs the stack trace for visibility in CI logs and displays the
 * error so developers can debug failures easily.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // Log the error so stack traces remain visible in the console and CI logs.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 space-y-4" data-testid="global-error">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      {/* Display stack trace to aid debugging in environments where console output isn't captured */}
      <pre className="overflow-auto rounded bg-muted p-2 text-sm" data-testid="error-stack">
        {error.stack}
      </pre>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-primary px-3 py-1.5 text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

