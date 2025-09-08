import { useState, useCallback } from 'react';

interface UseClientProjectFiltersReturn {
  selectedClientId: string;
  selectedProjectId: string;
  setClientId: (clientId: string) => void;
  setProjectId: (projectId: string) => void;
  clearFilters: () => void;
  hasFilters: boolean;
}

export const useClientProjectFilters = (): UseClientProjectFiltersReturn => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const setClientId = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    // Clear project when client changes
    if (clientId !== selectedClientId) {
      setSelectedProjectId('');
    }
  }, [selectedClientId]);

  const setProjectId = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedClientId('');
    setSelectedProjectId('');
  }, []);

  const hasFilters = selectedClientId !== '' && selectedProjectId !== '';

  return {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  };
};