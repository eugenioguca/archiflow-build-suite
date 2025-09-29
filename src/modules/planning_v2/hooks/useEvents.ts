/**
 * useEvents Hook - Planning v2
 * 
 * Manage webhooks and events
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as eventsService from '../services/eventsService';

export function useWebhooks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query webhooks
  const webhooksQuery = useQuery({
    queryKey: ['planning-v2-webhooks'],
    queryFn: eventsService.getWebhooks
  });

  // Create webhook
  const createMutation = useMutation({
    mutationFn: eventsService.createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-v2-webhooks'] });
      toast({
        title: 'Webhook creado',
        description: 'El webhook se ha configurado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo crear el webhook: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Update webhook
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      eventsService.updateWebhook(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-v2-webhooks'] });
      toast({
        title: 'Webhook actualizado',
        description: 'Los cambios se han guardado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo actualizar el webhook: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Delete webhook
  const deleteMutation = useMutation({
    mutationFn: eventsService.deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-v2-webhooks'] });
      toast({
        title: 'Webhook eliminado',
        description: 'El webhook se ha eliminado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo eliminar el webhook: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Toggle webhook
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      eventsService.toggleWebhook(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-v2-webhooks'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo cambiar el estado: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  return {
    // Data
    webhooks: webhooksQuery.data,
    isLoading: webhooksQuery.isLoading,
    
    // Mutations
    createWebhook: createMutation.mutateAsync,
    updateWebhook: updateMutation.mutateAsync,
    deleteWebhook: deleteMutation.mutateAsync,
    toggleWebhook: toggleMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending
  };
}

export function useEvents(filters?: {
  budgetId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['planning-v2-events', filters],
    queryFn: () => eventsService.getEvents(filters),
    enabled: !!filters
  });
}

export function useBudgetEvents(budgetId?: string, limit?: number) {
  return useQuery({
    queryKey: ['planning-v2-budget-events', budgetId, limit],
    queryFn: () => eventsService.getEvents({ budgetId, limit }),
    enabled: !!budgetId
  });
}
