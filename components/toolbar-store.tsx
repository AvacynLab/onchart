'use client';
import React, { createContext, useContext, useState, type ReactNode, Dispatch, SetStateAction } from 'react';

/**
 * Global store holding the visibility state of the finance toolbar.
 * Exposed via React context so dashboard tiles and the toolbar itself
 * can share the same open/close state without relying on overlays.
 */
export type ToolbarStore = {
  isVisible: boolean;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
};

const ToolbarStoreContext = createContext<ToolbarStore | undefined>(undefined);

export function ToolbarProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <ToolbarStoreContext.Provider value={{ isVisible, setIsVisible }}>
      {children}
    </ToolbarStoreContext.Provider>
  );
}

export function useToolbarStore() {
  const ctx = useContext(ToolbarStoreContext);
  if (!ctx) throw new Error('useToolbarStore must be used within ToolbarProvider');
  return ctx;
}
