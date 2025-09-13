import React, { useState, useEffect } from 'react';
import { Card, Badge, Alert } from 'antd';

/**
 * Performance monitor component to track API calls in development
 */
export const PerformanceMonitor = ({ enabled = false }) => {
  const [callCount, setCallCount] = useState(0);
  const [lastReset, setLastReset] = useState(Date.now());

  useEffect(() => {
    if (!enabled) return;

    // Monkey patch fetch to count API calls
    const originalFetch = window.fetch;
    let counter = 0;

    window.fetch = function(...args) {
      counter++;
      setCallCount(counter);
      console.log(`API Call #${counter}:`, args[0]);
      return originalFetch.apply(this, arguments);
    };

    // Reset counter every 30 seconds to track per-navigation calls
    const resetInterval = setInterval(() => {
      console.log(`API calls in last 30s: ${counter}`);
      counter = 0;
      setCallCount(0);
      setLastReset(Date.now());
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
