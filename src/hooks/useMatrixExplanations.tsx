import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MatrixExplanation {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export function useMatrixExplanations(planId: string) {
  const [explanations, setExplanations] = useState<MatrixExplanation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch explanations for a specific plan
  const fetchExplanations = async () => {
    if (!planId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matrix_explanations')
        .select('*')
        .eq('plan_id', planId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setExplanations(data || []);
    } catch (error: any) {
      console.error('Error fetching matrix explanations:', error);
      toast({
        title: "Error al cargar explicaciones",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new explanation
  const addExplanation = async (title: string, description: string) => {
    try {
      const nextOrder = Math.max(...explanations.map(e => e.order_index), -1) + 1;
      
      const { data, error } = await supabase
        .from('matrix_explanations')
        .insert({
          plan_id: planId,
          title,
          description,
          order_index: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setExplanations(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
      
      toast({
        title: "Explicación agregada",
        description: "La explicación se ha agregado correctamente",
      });

      return data;
    } catch (error: any) {
      console.error('Error adding explanation:', error);
      toast({
        title: "Error al agregar explicación",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update explanation
  const updateExplanation = async (id: string, updates: Partial<Pick<MatrixExplanation, 'title' | 'description'>>) => {
    try {
      const { data, error } = await supabase
        .from('matrix_explanations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setExplanations(prev => 
        prev.map(exp => exp.id === id ? { ...exp, ...data } : exp)
      );

      toast({
        title: "Explicación actualizada",
        description: "Los cambios se han guardado correctamente",
      });

      return data;
    } catch (error: any) {
      console.error('Error updating explanation:', error);
      toast({
        title: "Error al actualizar explicación",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Delete explanation
  const deleteExplanation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('matrix_explanations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExplanations(prev => prev.filter(exp => exp.id !== id));

      toast({
        title: "Explicación eliminada",
        description: "La explicación se ha eliminado correctamente",
      });
    } catch (error: any) {
      console.error('Error deleting explanation:', error);
      toast({
        title: "Error al eliminar explicación",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Reorder explanations
  const reorderExplanations = async (newOrder: MatrixExplanation[]) => {
    try {
      // Update each explanation's order_index individually
      const updatePromises = newOrder.map((exp, index) =>
        supabase
          .from('matrix_explanations')
          .update({ order_index: index })
          .eq('id', exp.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check if any update failed
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Failed to update some explanations order');
      }

      setExplanations(newOrder.map((exp, index) => ({ ...exp, order_index: index })));

      toast({
        title: "Orden actualizado",
        description: "El orden de las explicaciones se ha actualizado",
      });
    } catch (error: any) {
      console.error('Error reordering explanations:', error);
      toast({
        title: "Error al reordenar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchExplanations();
  }, [planId]);

  return {
    explanations,
    loading,
    addExplanation,
    updateExplanation,
    deleteExplanation,
    reorderExplanations,
    refetch: fetchExplanations,
  };
}