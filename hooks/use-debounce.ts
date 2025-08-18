'use client';

import { useEffect, useState } from 'react';

/**
 * useDebounce delays updating the returned value until after `delay` ms have
 * elapsed since the last change. Useful to avoid spamming network requests
 * when inputs like asset symbol or timeframe change rapidly.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => {
      clearTimeout(handle);
    };
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
