import { useMemo } from 'react';
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

// Function to normalize text for comparisons (same as TU)
const normalizeForComparison = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents (unaccent equivalent)
    .replace(/_/g, ' ');
};

export function useSubpartidas(
  departamento = 'CONSTRUCCIÓN',
  mayorId?: string,
  partidaId?: string
) {
  // Query para obtener subpartidas del catálogo TU (reusing TU logic exactly)
  const { data: rawSubpartidas = [], isLoading: isLoadingSubpartidas } = useQuery<SubpartidaTU[]>({
    queryKey: ['tu-subpartidas', departamento, mayorId, partidaId],
    queryFn: async (): Promise<SubpartidaTU[]> => {
      console.log('Loading subpartidas for:', { departamento, mayorId, partidaId });
      
      let allSubpartidas: SubpartidaTU[] = [];

      // If we have a specific partida, load subpartidas for it
      if (partidaId) {
        // Load dependent subpartidas
        const { data: dependientes, error: dependientesError } = await supabase
          .from('chart_of_accounts_subpartidas')
          .select('id, nombre, codigo, departamento_aplicable, partida_id, es_global, activo')
          .eq('partida_id', partidaId)
          .eq('activo', true)
          .order('codigo');

        if (dependientesError) throw dependientesError;

        if (dependientes) {
          allSubpartidas = [...allSubpartidas, ...dependientes];
        }
      }

      // Always load universal subpartidas for CONSTRUCCIÓN department
      const { data: universales, error: universalesError } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('id, nombre, codigo, departamento_aplicable, partida_id, es_global, activo')
        .eq('es_global', true)
        .eq('departamento_aplicable', departamento)
        .eq('activo', true)
        .order('codigo');

      if (universalesError) throw universalesError;

      if (universales) {
        allSubpartidas = [...allSubpartidas, ...universales];
      }

      // If no partida context and no mayor context, load all relevant subpartidas
      if (!partidaId && !mayorId) {
        const { data: allDept, error: allDeptError } = await supabase
          .from('chart_of_accounts_subpartidas')
          .select('id, nombre, codigo, departamento_aplicable, partida_id, es_global, activo')
          .or(`es_global.eq.true,departamento_aplicable.eq.${departamento}`)
          .eq('activo', true)
          .order('es_global', { ascending: false })
          .order('codigo')
          .limit(500); // Reasonable limit to prevent overload

        if (allDeptError) throw allDeptError;
        
        if (allDept) {
          allSubpartidas = allDept;
        }
      }

      // Remove duplicates based on ID
      const uniqueSubpartidas = allSubpartidas.filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      );

      // Sort exactly like TU: universals first, then by codigo (natural order), then by nombre
      uniqueSubpartidas.sort((a, b) => {
        // First by es_global (universals first)
        if (a.es_global !== b.es_global) {
          return b.es_global ? 1 : -1;
        }
        
        // Then try to sort by codigo naturally (extract numbers)
        if (a.codigo && b.codigo) {
          const aNumeric = a.codigo.replace(/\D/g, '');
          const bNumeric = b.codigo.replace(/\D/g, '');
          if (aNumeric && bNumeric) {
            const aNum = parseInt(aNumeric, 10);
            const bNum = parseInt(bNumeric, 10);
            if (aNum !== bNum) {
              return aNum - bNum;
            }
          }
          // If numeric comparison doesn't work, use string comparison
          const codigoCompare = a.codigo.localeCompare(b.codigo);
          if (codigoCompare !== 0) {
            return codigoCompare;
          }
        }
        
        // Finally by nombre
        return a.nombre.localeCompare(b.nombre);
      });
      
      console.log('Loaded subpartidas:', {
        total: uniqueSubpartidas.length,
        universales: uniqueSubpartidas.filter(s => s.es_global).length,
        especificas: uniqueSubpartidas.filter(s => !s.es_global).length
      });

      return uniqueSubpartidas;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert to SearchableComboboxItem format
  const subpartidas: SearchableComboboxItem[] = useMemo(() => {
    return rawSubpartidas.map(subpartida => ({
      value: subpartida.id,
      label: subpartida.es_global ? `${subpartida.nombre} (Universal)` : subpartida.nombre,
      codigo: subpartida.codigo,
      searchText: `${subpartida.codigo || ''} ${subpartida.nombre}`.toLowerCase(),
      group: subpartida.es_global ? 'Universal' : 'Específico',
      unidad_default: 'PZA' // Could be enhanced to read from subpartida if available
    }));
  }, [rawSubpartidas]);

  return {
    subpartidas,
    isLoadingSubpartidas,
    totalCount: rawSubpartidas.length,
  };
}