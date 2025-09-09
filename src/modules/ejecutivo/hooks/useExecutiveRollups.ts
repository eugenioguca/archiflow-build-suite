import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useExecutiveRollups(clientId?: string, projectId?: string, parametricId?: string) {
  const rollupsQuery = useQuery({
    queryKey: ['executive-rollups', clientId, projectId, parametricId],
    queryFn: async () => {
      if (!clientId || !projectId || !parametricId) {
        return {
          totalExecutive: 0,
          subpartidasCount: 0,
          byDepartment: {},
          byMayor: {},
          byPartida: {}
        };
      }

      // Get all executive subpartidas for rollup calculations
      const { data: items, error } = await supabase
        .from('presupuesto_ejecutivo_subpartida')
        .select(`
          *,
          subpartida:chart_of_accounts_subpartidas(codigo, nombre),
          partida_ejecutivo:presupuesto_ejecutivo_partida(
            id,
            parametrico:presupuesto_parametrico(
              mayor_id,
              partida_id,
              mayor:chart_of_accounts_mayor(codigo, nombre, departamento),
              partida:chart_of_accounts_partidas(codigo, nombre)
            )
          )
        `)
        .eq('cliente_id', clientId)
        .eq('proyecto_id', projectId);

      if (error) throw error;

      const executiveItems = items || [];
      
      // Calculate rollups
      const totalExecutive = executiveItems.reduce((sum, item) => sum + item.importe, 0);
      const subpartidasCount = executiveItems.length;

      // Group by department
      const byDepartment = executiveItems.reduce((acc, item) => {
        const dept = item.partida_ejecutivo?.parametrico?.mayor?.departamento || 'Sin Departamento';
        if (!acc[dept]) {
          acc[dept] = { total: 0, count: 0, items: [] };
        }
        acc[dept].total += item.importe;
        acc[dept].count += 1;
        acc[dept].items.push(item);
        return acc;
      }, {} as Record<string, any>);

      // Group by mayor
      const byMayor = executiveItems.reduce((acc, item) => {
        const mayor = item.partida_ejecutivo?.parametrico?.mayor?.nombre || 'Sin Mayor';
        if (!acc[mayor]) {
          acc[mayor] = { total: 0, count: 0, items: [] };
        }
        acc[mayor].total += item.importe;
        acc[mayor].count += 1;
        acc[mayor].items.push(item);
        return acc;
      }, {} as Record<string, any>);

      // Group by partida
      const byPartida = executiveItems.reduce((acc, item) => {
        const partida = item.partida_ejecutivo?.parametrico?.partida?.nombre || 'Sin Partida';
        if (!acc[partida]) {
          acc[partida] = { total: 0, count: 0, items: [] };
        }
        acc[partida].total += item.importe;
        acc[partida].count += 1;
        acc[partida].items.push(item);
        return acc;
      }, {} as Record<string, any>);

      return {
        totalExecutive,
        subpartidasCount,
        byDepartment,
        byMayor,
        byPartida,
        lastCalculated: new Date().toISOString()
      };
    },
    enabled: Boolean(clientId && projectId && parametricId),
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    rollups: rollupsQuery.data,
    isLoadingRollups: rollupsQuery.isLoading,
    isErrorRollups: rollupsQuery.isError,
    errorRollups: rollupsQuery.error,
    refetchRollups: rollupsQuery.refetch,
  };
}