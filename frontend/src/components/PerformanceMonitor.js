import { useEffect } from 'react';

/**
 * Performance monitor component to track API calls in development
 */
export const PerformanceMonitor = ({ enabled = false }) => {

  useEffect(() => {
    if (!enabled) return;

    // Monkey patch fetch to count API calls
    const originalFetch = window.fetch;
    let counter = 0;

    window.fetch = function(...args) {
      counter++;
      console.log(`API Call #${counter}:`, args[0]);
      return originalFetch.apply(this, arguments);
    };

    // Reset counter every 30 seconds to track per-navigation calls
    const resetInterval = setInterval(() => {
      console.log(`API calls in last 30s: ${counter}`);
      counter = 0;
    }, 30000);

    return () => {
      window.fetch = originalFetch;
      clearInterval(resetInterval);
    };
  }, [enabled]);

  if (!enabled) return null;

  // No UI, just console logging
  return null;
};

export default PerformanceMonitor;
