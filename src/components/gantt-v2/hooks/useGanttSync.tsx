import { useEffect } from 'react';
import { useParametricGanttSync } from '@/hooks/useParametricGanttSync';

export const useGanttSync = (clientId?: string, projectId?: string) => {
  const { syncFromParametric } = useParametricGanttSync(clientId, projectId);

  useEffect(() => {
    const handleParametricChange = (event: CustomEvent) => {
      const { clienteId, proyectoId } = event.detail;
      
      // Only sync if the event is for the current client/project
      if (clienteId === clientId && proyectoId === projectId) {
        console.log('[GANTT-SYNC] Parametric budget changed, triggering sync');
        syncFromParametric.mutate();
      }
    };

    // Listen for parametric budget changes
    window.addEventListener('parametric-budget-changed', handleParametricChange as EventListener);

    return () => {
      window.removeEventListener('parametric-budget-changed', handleParametricChange as EventListener);
    };
  }, [clientId, projectId, syncFromParametric]);

  return { syncFromParametric };
};