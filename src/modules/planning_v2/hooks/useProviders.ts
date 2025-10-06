import { useQuery } from '@tanstack/react-query';
import { providersAdapter } from '../adapters/providers';

/**
 * Hook to fetch providers with optional search
 */
export function useProviders(searchQuery: string = '') {
  return useQuery({
    queryKey: ['providers', searchQuery],
    queryFn: () => providersAdapter.getAllProviders(searchQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single provider by ID
 */
export function useProviderById(providerId: string | null | undefined) {
  return useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => providerId ? providersAdapter.getProviderById(providerId) : null,
    enabled: !!providerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
