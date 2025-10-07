/**
 * Planning V2 Shell - Provides cleanup safety net
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cleanupStuckDialogs } from '../../utils/dialogCleanup';

interface PlanningV2ShellProps {
  children: React.ReactNode;
}

export function PlanningV2Shell({ children }: PlanningV2ShellProps) {
  const location = useLocation();

  useEffect(() => {
    // Cleanup stuck dialogs on route change or visibility change
    const cleanup = () => {
      // Small delay to let React finish unmounting
      setTimeout(() => cleanupStuckDialogs(), 100);
    };
    
    // Clean on visibility regain (user switches back to tab)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        cleanup();
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
