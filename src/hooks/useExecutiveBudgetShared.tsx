import { useQuery } from '@tanstack/react-query';
import { getExecutiveBudgetFinal, type ExecutiveBudgetItem } from '@/services/budget/getExecutiveBudgetFinal';

/**
 * Shared hook for executive budget data - used by both Planning and Construction modules
 * Ensures consistent data access across modules
 */
export function useExecutiveBudgetShared(clientId?: string, projectId?: string) {
  const query = useQuery({
    queryKey: ['executive-budget-final', clientId, projectId],
    queryFn: () => getExecutiveBudgetFinal(clientId, projectId),
    enabled: Boolean(clientId && projectId),
  });

  return {
    executiveBudgetItems: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}