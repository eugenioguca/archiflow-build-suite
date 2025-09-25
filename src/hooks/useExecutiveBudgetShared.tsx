import { useQuery } from '@tanstack/react-query';
import { getExecutiveBudgetFinal, type FinalBudgetRow, type FinalBudgetTotals, type FinalBudgetGrouped } from '@/services/budget/getExecutiveBudgetFinal';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared hook for executive budget data - used by both Planning and Construction modules
 * Replicates the exact same logic as Planning's Vista Final
 */
export function useExecutiveBudgetShared(clientId?: string, projectId?: string) {
  // Main budget data query
  const budgetQuery = useQuery({
    queryKey: ['executive-budget-final', clientId, projectId],
    queryFn: () => getExecutiveBudgetFinal(clientId, projectId),
    enabled: Boolean(clientId && projectId),
  });

  // Company settings query for PDF exports
  const companyQuery = useQuery({
    queryKey: ['company-branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_branding')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const budgetData = budgetQuery.data || {
    finalRows: [],
    totals: {
      totalParametrico: 0,
      totalEjecutivo: 0,
      totalResidual: 0,
      diferencia: 0,
      partidasCount: 0,
      subpartidasCount: 0,
      residualesExcedidos: 0
    },
    groupedByMayor: {}
  };

  return {
    finalRows: budgetData.finalRows,
    totals: budgetData.totals,
    groupedByMayor: budgetData.groupedByMayor,
    companySettings: companyQuery.data,
    isLoading: budgetQuery.isLoading || companyQuery.isLoading,
    isError: budgetQuery.isError || companyQuery.isError,
    error: budgetQuery.error || companyQuery.error,
    refetch: budgetQuery.refetch,
    hasData: budgetData.finalRows.length > 0,
  };
}