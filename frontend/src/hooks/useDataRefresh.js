import { useState, useCallback } from 'react';
import { useData } from '../contexts/DataContext';

/**
 * Hook for managing data refresh functionality
 * Provides cache clearing and refresh triggering logic
 */
export const useDataRefresh = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { clearCache } = useData();

  /**
   * Handle data refresh by clearing relevant caches and triggering re-fetch
   */
  const handleRefresh = useCallback(() => {
    // Clear all relevant caches
    clearCache('teacherCourses');
    clearCache('studentsByTeacher');
    clearCache('courseStats');
    clearCache('teacherDashboard');
    
    // Trigger re-fetch by updating the key
    setRefreshKey(prev => prev + 1);
  }, [clearCache]);

  /**
   * Clear specific cache entries
   * @param {string|Array} cacheKeys - Single cache key or array of cache keys to clear
   */
  const clearSpecificCache = useCallback((cacheKeys) => {
    const keys = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
    keys.forEach(key => clearCache(key));
  }, [clearCache]);

  /**
   * Trigger refresh without clearing cache (force re-render)
   */
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    refreshKey,
    handleRefresh,
    clearSpecificCache,
    triggerRefresh
  };
};