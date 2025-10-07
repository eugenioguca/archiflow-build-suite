/**
 * Planning V2 Shell - Provides cleanup safety net
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUILoadingStore } from '@/stores/uiLoadingStore';

interface PlanningV2ShellProps {
  children: React.ReactNode;
}

export function PlanningV2Shell({ children }: PlanningV2ShellProps) {
  const location = useLocation();
  const stopLoading = useUILoadingStore(state => state.stop);

  useEffect(() => {
    // Cleanup function to run on route changes and visibility changes
    const cleanup = () => stopLoading();
    
    // Clean on visibility regain (user switches back to tab)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        stopLoading();
      }
    };
    
    document.addEventListener('visibilitychange', onVis);
    
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      cleanup();
    };
  }, [location.pathname, stopLoading]);

  return <>{children}</>;
}
