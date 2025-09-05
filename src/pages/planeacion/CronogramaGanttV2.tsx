import { GanttPage } from '@/components/gantt-v2/GanttPage';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';

export default function CronogramaGanttV2() {
  const {
    selectedClientId,
    selectedProjectId,
  } = useClientProjectFilters();

  return (
    <GanttPage 
      selectedClientId={selectedClientId}
      selectedProjectId={selectedProjectId}
    />
  );
}