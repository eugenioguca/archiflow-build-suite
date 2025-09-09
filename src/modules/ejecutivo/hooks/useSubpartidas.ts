import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SearchableComboboxItem } from '@/components/ui/searchable-combobox';

interface SubpartidaTU {
  id: string;
  codigo: string;
  nombre: string;
  departamento_aplicable: string;
  partida_id: string | null;
  es_global: boolean;
  activo: boolean;
}

export function useSubpartidas(
  departamento = 'CONSTRUCCIÓN',
  mayorId?: string,
  partidaId?: string
) {
  const [searchQuery, setSearchQuery] = useState('');

  // Query para obtener subpartidas del catálogo TU
  const { data: rawSubpartidas = [], isLoading: isLoadingSubpartidas } = useQuery({
    queryKey: ['tu-subpartidas', departamento, mayorId, partidaId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('chart_of_accounts_subpartidas')
        .select('*')
        .eq('activo', true);

      // Filtrar por departamento si se especifica
      if (departamento) {
        query = query.or(`es_global.eq.true,departamento_aplicable.eq.${departamento}`);
      }

      // Si hay contexto de mayor/partida, filtrar por ello también
      if (partidaId) {
        query = query.or(`partida_id.eq.${partidaId},es_global.eq.true`);
      }

      // Búsqueda por texto si existe
      if (searchQuery) {
        query = query.ilike('nombre', `%${searchQuery}%`);
      }

      query = query
        .order('es_global', { ascending: false })
        .order('nombre', { ascending: true })
        .limit(50);

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SubpartidaTU[];
    },
    enabled: true,
  });

  // Convertir a formato SearchableComboboxItem
  const subpartidas: SearchableComboboxItem[] = useMemo(() => {
    return rawSubpartidas.map(subpartida => ({
      value: subpartida.id,
      label: subpartida.nombre,
      codigo: subpartida.codigo,
      searchText: `${subpartida.codigo} ${subpartida.nombre}`,
      group: subpartida.es_global ? 'Universal' : 'Específico',
      unidad_default: 'pza' // Default unit, could be enhanced to read from subpartida if available
    }));
  }, [rawSubpartidas]);

  // Función para búsqueda con debounce
  const searchSubpartidas = (query: string) => {
    setSearchQuery(query);
  };

  return {
    subpartidas,
    isLoadingSubpartidas,
    searchSubpartidas,
  };
}