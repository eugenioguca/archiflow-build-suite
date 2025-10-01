/**
 * Hook to fetch subpartidas by partida with optional search
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { tuAdapter } from '../adapters/tu';

export function useSubpartidasByPartida(partidaId: string | undefined, searchQuery?: string) {
  return useQuery({
    queryKey: ['tu', 'subpartidas', partidaId, searchQuery],
    queryFn: () => {
      if (!partidaId) return [];
      return tuAdapter.getSubpartidasByPartida(partidaId, searchQuery);
    },
    enabled: !!partidaId,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
