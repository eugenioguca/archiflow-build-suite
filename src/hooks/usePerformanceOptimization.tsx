import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './use-debounce';

/**
 * Performance optimization hook for heavy computations and data processing
 * Provides memoization, debouncing, and lazy loading capabilities
 */
export function usePerformanceOptimization() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cache, setCache] = useState(new Map<string, any>());

  // Clear cache periodically to prevent memory leaks
  useEffect(() => {
    const interval = setInterval(() => {
      setCache(prev => {
        if (prev.size > 100) {
          prev.clear();
        }
        return prev;
      });
    }, 5 * 60 * 1000); // Clear every 5 minutes if cache is large

    return () => clearInterval(interval);
  }, []);

  const memoizedComputation = useCallback((
    key: string,
    computeFn: (data: any) => any,
    data: any,
    dependencies: any[] = []
  ) => {
    const cacheKey = `${key}_${JSON.stringify(dependencies)}`;
    
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    setIsProcessing(true);
    try {
      const result = computeFn(data);
      setCache(prev => new Map(prev.set(cacheKey, result)));
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [cache]);

  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      setCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (!key.includes(pattern)) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    } else {
      setCache(new Map());
    }
  }, []);

  return {
    isProcessing,
    memoizedComputation,
    clearCache,
    cacheSize: cache.size
  };
}

/**
 * Hook for optimizing list rendering with virtual scrolling concepts
 */
export function useListOptimization(
  items: any[],
  itemHeight: number = 50,
  containerHeight: number = 400
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 2,
      items.length
    );
    
    return {
      start: Math.max(0, startIndex - 1),
      end: endIndex
    };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      top: (visibleRange.start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange
  };
}

/**
 * Hook for lazy loading components and data
 */
export function useLazyLoading(
  loadFn: () => Promise<any>,
  dependencies: any[] = [],
  eager: boolean = false
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded && !eager) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await loadFn();
      setData(result);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Loading failed'));
    } finally {
      setLoading(false);
    }
  }, [loadFn, loaded, eager]);

  // Auto-load if eager is true
  useEffect(() => {
    if (eager) {
      load();
    }
  }, [eager, load, ...dependencies]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setLoaded(false);
  }, []);

  return {
    data,
    loading,
    error,
    loaded,
    load,
    reset
  };
}

/**
 * Hook for debounced operations with performance tracking
 */
export function useDebounceOptimized(callback: (...args: any[]) => void, delay: number = 300) {
  const [operationCount, setOperationCount] = useState(0);
  const [lastExecuted, setLastExecuted] = useState<Date | null>(null);
  
  const debouncedCallback = useDebounce((...args: any[]) => {
    setOperationCount(prev => prev + 1);
    setLastExecuted(new Date());
    callback(...args);
  }, delay);

  const resetStats = useCallback(() => {
    setOperationCount(0);
    setLastExecuted(null);
  }, []);

  return {
    debouncedCallback,
    operationCount,
    lastExecuted,
    resetStats
  };
}