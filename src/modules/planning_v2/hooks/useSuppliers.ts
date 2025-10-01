import { useQuery } from '@tanstack/react-query';
import { suppliersAdapter } from '../adapters/suppliers';

/**
 * Hook to fetch suppliers with optional search
 */
export function useSuppliers(searchQuery: string = '') {
  return useQuery({
    queryKey: ['suppliers', searchQuery],
    queryFn: () => suppliersAdapter.getSuppliers(searchQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single supplier by ID
 */
export function useSupplierById(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => supplierId ? suppliersAdapter.getSupplierById(supplierId) : null,
    enabled: !!supplierId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
