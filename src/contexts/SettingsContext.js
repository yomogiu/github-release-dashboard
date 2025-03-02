import React, { createContext, useState, useContext, useEffect } from 'react';
import githubService from '../services/githubService';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [cacheExpiryTime, setCacheExpiryTime] = useState(30); // Default: 30 minutes
  const [itemLimit, setItemLimit] = useState(null); // Default: null (no limit)
  const [rateLimit, setRateLimit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    // Load cache time setting
    const savedCacheTime = localStorage.getItem('cache_expiry_time');
    if (savedCacheTime) {
      const time = parseInt(savedCacheTime, 10);
      setCacheExpiryTime(time);
      githubService.setCacheExpiryTime(time);
    }

    // Load item limit setting
    const savedItemLimit = localStorage.getItem('item_limit');
    if (savedItemLimit) {
      const limit = parseInt(savedItemLimit, 10);
      setItemLimit(limit);
    }
  }, []);

  // Update cache expiry time
  const updateCacheExpiryTime = (minutes) => {
    const time = parseInt(minutes, 10);
    if (time > 0) {
      setCacheExpiryTime(time);
      localStorage.setItem('cache_expiry_time', time.toString());
      githubService.setCacheExpiryTime(time);
      return true;
    }
    return false;
  };

  // Update item limit
  const updateItemLimit = (limit) => {
    if (limit === '' || limit === null) {
      // Remove the limit
      setItemLimit(null);
      localStorage.removeItem('item_limit');
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('itemLimitChanged', { detail: null }));
      return true;
    }
    
    const numLimit = parseInt(limit, 10);
    if (numLimit > 0) {
      setItemLimit(numLimit);
      localStorage.setItem('item_limit', numLimit.toString());
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('itemLimitChanged', { detail: numLimit }));
      return true;
    }
    return false;
  };

  // Fetch current rate limit
  const fetchRateLimit = async () => {
    setIsLoading(true);
    try {
      const result = await githubService.getRateLimit();
      if (result.success) {
        setRateLimit(result.rateLimit);
      }
    } catch (error) {
      console.error('Error fetching rate limit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all cached data
  const clearAllCache = () => {
    githubService.cache.clear();
  };

  const value = {
    cacheExpiryTime,
    updateCacheExpiryTime,
    itemLimit,
    updateItemLimit,
    rateLimit,
    fetchRateLimit,
    clearAllCache,
    isLoading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;