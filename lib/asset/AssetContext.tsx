'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Discrete timeframes supported by the dashboard charts.
 * Narrow union keeps the context strongly typed and avoids invalid values.
 */
export type Timeframe = '1m' | '5m' | '1h' | '4h' | '1d';

/**
 * Shape of the asset state shared across the bento dashboard.
 * `symbol` and `timeframe` are persisted locally so the last viewed asset is
 * restored when the user returns.
 */
export interface AssetState {
  symbol: string;
  name?: string;
  timeframe: Timeframe;
  panes: 1 | 2 | 4;
  sync: boolean;
}

/**
 * Public API exposed by the asset context.
 */
export interface AssetContextValue {
  asset: AssetState;
  setAsset: (symbol: string, name?: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setPanes: (p: 1 | 2 | 4) => void;
  toggleSync: () => void;
}

// Reasonable defaults used before the first user interaction.
const DEFAULT_ASSET: AssetState = {
  symbol: 'AAPL',
  timeframe: '1h',
  panes: 1,
  sync: false,
};

const AssetCtx = createContext<AssetContextValue | undefined>(undefined);

/**
 * Provider storing the current asset selection and related view settings.
 * The state is hydrated from `localStorage` and kept in sync on changes.
 */
export function AssetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [asset, setAsset] = useState<AssetState>(() => {
    if (typeof window === 'undefined') return DEFAULT_ASSET;
    const storedSymbol = localStorage.getItem('lastAsset');
    const storedTf = localStorage.getItem('lastTF') as Timeframe | null;
    return {
      ...DEFAULT_ASSET,
      ...(storedSymbol ? { symbol: storedSymbol } : {}),
      ...(storedTf ? { timeframe: storedTf } : {}),
    };
  });

  // Persist symbol and timeframe whenever they change.
  useEffect(() => {
    localStorage.setItem('lastAsset', asset.symbol);
    localStorage.setItem('lastTF', asset.timeframe);
  }, [asset.symbol, asset.timeframe]);

  const value: AssetContextValue = {
    asset,
    setAsset: (symbol, name) => setAsset((s) => ({ ...s, symbol, name })),
    setTimeframe: (tf) => setAsset((s) => ({ ...s, timeframe: tf })),
    setPanes: (p) => setAsset((s) => ({ ...s, panes: p })),
    toggleSync: () => setAsset((s) => ({ ...s, sync: !s.sync })),
  };

  return <AssetCtx.Provider value={value}>{children}</AssetCtx.Provider>;
}

/**
 * Hook to access the current asset context. Must be used under `AssetProvider`.
 */
export function useAsset(): AssetContextValue {
  const ctx = useContext(AssetCtx);
  if (!ctx) throw new Error('useAsset must be used within AssetProvider');
  return ctx;
}
