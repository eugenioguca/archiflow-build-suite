import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Mayor {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string;
  activo: boolean;
}

export const useMayoresTU = () => {
  return useQuery({
    queryKey: ['mayores-construccion'],
    queryFn: async () => {
      // Use toUpperCase() to normalize department name for comparison
      const departmentName = 'CONSTRUCCIÓN';
      
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, codigo, nombre, departamento, activo')
        .eq('departamento', departmentName)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;
      return (data || []) as Mayor[];
    },
  });
};