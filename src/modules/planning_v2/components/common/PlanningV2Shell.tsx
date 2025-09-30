/**
 * Planning V2 Shell - Provides cleanup safety net
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { unfreezeUI } from '../../utils/unfreeze';

interface PlanningV2ShellProps {
  children: React.ReactNode;
}

export function PlanningV2Shell({ children }: PlanningV2ShellProps) {
  const location = useLocation();

  useEffect(() => {
    // Cleanup function to run on route changes and visibility changes
    const cleanup = () => unfreezeUI('route-change');
    
    // Clean on visibility regain (user switches back to tab)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        unfreezeUI('visibilitychange');
      }
    };
    
    document.addEventListener('visibilitychange', onVis);
    
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      cleanup();
    };
  }, [location.pathname]);

  return <>{children}</>;
}
