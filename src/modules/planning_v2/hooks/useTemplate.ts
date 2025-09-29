/**
 * useTemplate Hook - Planning v2
 * 
 * Manage templates and apply them to budgets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as templateService from '../services/templateService';
import type { TemplateDelta } from '../types';

export function useTemplate(templateId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all templates
  const templatesQuery = useQuery({
    queryKey: ['planning-templates'],
    queryFn: templateService.getTemplates
  });

  // Get single template
  const templateQuery = useQuery({
    queryKey: ['planning-template', templateId],
    queryFn: () => templateService.getTemplateById(templateId!),
    enabled: !!templateId
  });

  // Get template fields
  const fieldsQuery = useQuery({
    queryKey: ['planning-template-fields', templateId],
    queryFn: () => templateService.getTemplateFields(templateId!),
    enabled: !!templateId
  });

  // Get template partidas
  const partidasQuery = useQuery({
    queryKey: ['planning-template-partidas', templateId],
    queryFn: () => templateService.getTemplatePartidas(templateId!),
    enabled: !!templateId
  });

  // Get template conceptos
  const conceptosQuery = useQuery({
    queryKey: ['planning-template-conceptos', templateId],
    queryFn: () => templateService.getTemplateConceptosByTemplate(templateId!),
    enabled: !!templateId
  });

  // Create template
  const createMutation = useMutation({
    mutationFn: templateService.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      toast({
        title: 'Plantilla creada',
        description: 'La plantilla se ha creado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo crear la plantilla: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Update template
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      templateService.updateTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      queryClient.invalidateQueries({ queryKey: ['planning-template', templateId] });
      toast({
        title: 'Plantilla actualizada',
        description: 'Los cambios se han guardado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo actualizar la plantilla: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: templateService.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      toast({
        title: 'Plantilla eliminada',
        description: 'La plantilla se ha eliminado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo eliminar la plantilla: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Calculate delta
  const calculateDeltaMutation = useMutation({
    mutationFn: ({ templateId, budgetId }: { templateId: string; budgetId: string }) =>
      templateService.calculateTemplateDelta(templateId, budgetId),
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo calcular los cambios: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Apply template
  const applyTemplateMutation = useMutation({
    mutationFn: ({ 
      templateId, 
      budgetId, 
      delta 
    }: { 
      templateId: string; 
      budgetId: string; 
      delta: TemplateDelta 
    }) =>
      templateService.applyTemplate(templateId, budgetId, delta),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-budget', variables.budgetId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['planning-partidas', variables.budgetId] 
      });
      toast({
        title: 'Plantilla aplicada',
        description: 'La plantilla se ha aplicado exitosamente al presupuesto'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo aplicar la plantilla: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  return {
    // Queries
    templates: templatesQuery.data,
    template: templateQuery.data,
    fields: fieldsQuery.data,
    partidas: partidasQuery.data,
    conceptos: conceptosQuery.data,
    isLoading: templatesQuery.isLoading || templateQuery.isLoading,
    
    // Mutations
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    calculateDelta: calculateDeltaMutation.mutateAsync,
    applyTemplate: applyTemplateMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCalculatingDelta: calculateDeltaMutation.isPending,
    isApplying: applyTemplateMutation.isPending
  };
}
