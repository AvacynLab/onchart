import React from 'react';

/**
 * Global disclaimer displayed throughout the application.
 * Indicates that streamed market data is sourced from free tiers
 * and might therefore be delayed.
 */
export function Disclaimer() {
  return (
    <p
      className="text-xs text-center text-muted-foreground p-2"
      aria-label="market-data-disclaimer"
    >
      Données gratuites, peut comporter un décalage.
    </p>
  );
}

export default Disclaimer;
