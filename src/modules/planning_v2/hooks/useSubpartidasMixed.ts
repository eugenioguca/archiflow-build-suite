/**
 * Hook para obtener subpartidas mixtas: dependientes de una partida + globales de Construcción
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { tuAdapter } from '../adapters/tu';

export function useSubpartidasMixed(
  partidaId: string | undefined,
  searchQuery: string = ''
) {
  return useQuery({
    queryKey: ['tu-subpartidas-mixed', partidaId, searchQuery],
    queryFn: () => tuAdapter.getSubpartidasForPartidaOrGlobal({
      partidaId,
      departamento: 'CONSTRUCCIÓN',
      searchQuery,
      limit: 100,
    }),
    enabled: true, // Siempre habilitado para cargar globales
    placeholderData: keepPreviousData,
  });
}
