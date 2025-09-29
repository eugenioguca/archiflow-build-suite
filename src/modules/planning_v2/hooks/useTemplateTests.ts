/**
 * useTemplateTests Hook - Planning v2
 * 
 * Manage and execute template tests
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as templateTestService from '../services/templateTestService';

export function useTemplateTests(templateId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all tests for template
  const testsQuery = useQuery({
    queryKey: ['planning-template-tests', templateId],
    queryFn: () => templateTestService.getTemplateTests(templateId!),
    enabled: !!templateId
  });

  // Create test
  const createMutation = useMutation({
    mutationFn: templateTestService.createTemplateTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-template-tests', templateId] 
      });
      toast({
        title: 'Prueba creada',
        description: 'La prueba se ha creado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo crear la prueba: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Update test
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      templateTestService.updateTemplateTest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-template-tests', templateId] 
      });
      toast({
        title: 'Prueba actualizada',
        description: 'Los cambios se han guardado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo actualizar la prueba: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Delete test
  const deleteMutation = useMutation({
    mutationFn: templateTestService.deleteTemplateTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-template-tests', templateId] 
      });
      toast({
        title: 'Prueba eliminada',
        description: 'La prueba se ha eliminado exitosamente'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo eliminar la prueba: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Run single test
  const runTestMutation = useMutation({
    mutationFn: templateTestService.runTemplateTest,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-template-tests', templateId] 
      });
      
      if (result.passed) {
        toast({
          title: '✓ Prueba exitosa',
          description: `${result.test_name} - Total: $${result.actual_grand_total.toFixed(2)}`
        });
      } else {
        toast({
          title: '✗ Prueba fallida',
          description: `${result.test_name} - Diferencia: $${Math.abs(result.difference).toFixed(2)}`,
          variant: 'destructive'
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo ejecutar la prueba: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Run all tests
  const runAllTestsMutation = useMutation({
    mutationFn: () => templateTestService.runAllTemplateTests(templateId!),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-template-tests', templateId] 
      });
      
      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      
      toast({
        title: `Pruebas completadas: ${passed}/${total}`,
        description: passed === total 
          ? '¡Todas las pruebas pasaron exitosamente!' 
          : `${total - passed} prueba(s) fallaron`,
        variant: passed === total ? 'default' : 'destructive'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudieron ejecutar las pruebas: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Validate all tests
  const validateTestsMutation = useMutation({
    mutationFn: () => templateTestService.validateTemplateTests(templateId!),
    onSuccess: ({ allPassed, results }) => {
      queryClient.invalidateQueries({ 
        queryKey: ['planning-template-tests', templateId] 
      });
      
      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      
      toast({
        title: allPassed ? '✓ Validación exitosa' : '✗ Validación fallida',
        description: `${passed}/${total} pruebas pasaron`,
        variant: allPassed ? 'default' : 'destructive'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo validar: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  return {
    // Query
    tests: testsQuery.data,
    isLoading: testsQuery.isLoading,
    
    // Mutations
    createTest: createMutation.mutateAsync,
    updateTest: updateMutation.mutateAsync,
    deleteTest: deleteMutation.mutateAsync,
    runTest: runTestMutation.mutateAsync,
    runAllTests: runAllTestsMutation.mutateAsync,
    validateTests: validateTestsMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRunningTest: runTestMutation.isPending,
    isRunningAllTests: runAllTestsMutation.isPending,
    isValidating: validateTestsMutation.isPending
  };
}
