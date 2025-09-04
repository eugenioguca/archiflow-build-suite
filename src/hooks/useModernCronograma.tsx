import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentMonth, formatDateToYYYYMM } from '@/utils/cronogramaWeekUtils';

export interface ModernGanttActivity {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  departamento: string;
  mayor_id: string;
  start_month: string; // YYYY-MM format
  start_week: number;
  end_month: string; // YYYY-MM format
  end_week: number;
  duration_weeks: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  mayor?: { id: string; codigo: string; nombre: string };
}

export interface MatrixOverride {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  mes: string; // YYYY-MM format
  concepto: string;
  valor: string;
  sobrescribe: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyCalculations {
  gastoPorMes: Record<string, number>;
  avanceParcial: Record<string, number>;
  avanceAcumulado: Record<string, number>;
  ministraciones: Record<string, number>;
  inversionAcumulada: Record<string, number>;
  fechasPago: Record<string, string[]>;
  totalPresupuesto: number;
}

export const useModernCronograma = (clienteId?: string, proyectoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Gantt activities
  const activitiesQuery = useQuery({
    queryKey: ['modern-cronograma-activities', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return [];

      const { data, error } = await supabase
        .from('cronograma_gantt')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(id, codigo, nombre)
        `)
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      // Convert database format to our string format
      return (data || []).map(item => ({
        ...item,
        start_month: typeof item.start_month === 'number' 
          ? formatDateToYYYYMM(new Date(item.start_month, 0))
          : item.start_month,
        end_month: typeof item.end_month === 'number'
          ? formatDateToYYYYMM(new Date(item.end_month, 0))
          : item.end_month
      })) as ModernGanttActivity[];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Fetch construction mayores
  const mayoresQuery = useQuery({
    queryKey: ['mayores-construccion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, nombre, codigo, departamento')
        .eq('departamento', 'Construcción')
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch matrix overrides
  const matrixOverridesQuery = useQuery({
    queryKey: ['cronograma-matrix-overrides', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return [];

      const { data, error } = await supabase
        .from('cronograma_matriz_manual')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId)
        .order('mes', { ascending: true });

      if (error) throw error;
      // Convert database format to our string format  
      return (data || []).map(item => ({
        ...item,
        mes: typeof item.mes === 'number'
          ? formatDateToYYYYMM(new Date(item.mes, 0))
          : item.mes
      })) as MatrixOverride[];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Fetch presupuesto parametrico totals
  const parametricoTotalsQuery = useQuery({
    queryKey: ['presupuesto-parametrico-totals', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return { totalsByMayor: {}, totalGeneral: 0 };

      const { data, error } = await supabase
        .from('presupuesto_parametrico')
        .select('mayor_id, monto_total')
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId);

      if (error) throw error;

      const totalsByMayor: Record<string, number> = {};
      let totalGeneral = 0;

      (data || []).forEach(item => {
        if (!totalsByMayor[item.mayor_id]) {
          totalsByMayor[item.mayor_id] = 0;
        }
        totalsByMayor[item.mayor_id] += item.monto_total || 0;
        totalGeneral += item.monto_total || 0;
      });

      return { totalsByMayor, totalGeneral };
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Fetch payment plans
  const paymentPlansQuery = useQuery({
    queryKey: ['payment-plans', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return [];

      const { data, error } = await supabase
        .from('payment_plans')
        .select(`
          *,
          installments:payment_installments(*)
        `)
        .eq('client_project_id', proyectoId)
        .eq('is_current_plan', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Calculate monthly values
  const calculations = React.useMemo((): MonthlyCalculations => {
    const activities = activitiesQuery.data || [];
    const overrides = matrixOverridesQuery.data || [];
    const parametricoTotals = parametricoTotalsQuery.data;
    const paymentPlans = paymentPlansQuery.data || [];

    // Create override lookup
    const overrideLookup: Record<string, string> = {};
    overrides.forEach(override => {
      const key = `${override.mes}-${override.concepto}`;
      overrideLookup[key] = override.valor;
    });

    // Initialize calculation results
    const gastoPorMes: Record<string, number> = {};
    const avanceParcial: Record<string, number> = {};
    const avanceAcumulado: Record<string, number> = {};
    const ministraciones: Record<string, number> = {};
    const inversionAcumulada: Record<string, number> = {};
    const fechasPago: Record<string, string[]> = {};

    // Get total budget
    const totalPresupuesto = parametricoTotals?.totalGeneral || 0;

    // Calculate monthly values (simplified - in real implementation would be more complex)
    // This would need to implement the calculation logic based on activities and parametric budget

    return {
      gastoPorMes,
      avanceParcial,
      avanceAcumulado,
      ministraciones,
      inversionAcumulada,
      fechasPago,
      totalPresupuesto
    };
  }, [activitiesQuery.data, matrixOverridesQuery.data, parametricoTotalsQuery.data, paymentPlansQuery.data]);

  // Create activity mutation
  const createActivity = useMutation({
    mutationFn: async (activityData: {
      departamento_id: string;
      mayor_id: string;
      start_month: string;
      start_week: number;
      end_month: string;
      end_week: number;
      duration_weeks: number;
    }) => {
      if (!clienteId || !proyectoId) throw new Error('Cliente y proyecto requeridos');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Convert string months to numbers for database
      const startYear = parseInt(activityData.start_month.split('-')[0]);
      const startMonth = parseInt(activityData.start_month.split('-')[1]);
      const endYear = parseInt(activityData.end_month.split('-')[0]);
      const endMonth = parseInt(activityData.end_month.split('-')[1]);

      const { data, error } = await supabase
        .from('cronograma_gantt')
        .insert([{
          cliente_id: clienteId,
          proyecto_id: proyectoId,
          departamento: activityData.departamento_id,
          mayor_id: activityData.mayor_id,
          start_month: startYear * 100 + startMonth,
          start_week: activityData.start_week,
          end_month: endYear * 100 + endMonth,
          end_week: activityData.end_week,
          duration_weeks: activityData.duration_weeks,
          // Convert to legacy date fields for compatibility
          fecha_inicio: `${activityData.start_month}-01`,
          fecha_fin: `${activityData.end_month}-28`,
          duracion: activityData.duration_weeks * 7,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modern-cronograma-activities'] });
      toast({
        title: "Actividad creada",
        description: "La actividad se ha agregado al cronograma."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la actividad.",
        variant: "destructive"
      });
    }
  });

  // Update activity mutation
  const updateActivity = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ModernGanttActivity> }) => {
      // Convert string months to numbers for database if present
      const updateData: any = { ...data };
      if (data.start_month) {
        const [year, month] = data.start_month.split('-').map(Number);
        updateData.start_month = year * 100 + month;
      }
      if (data.end_month) {
        const [year, month] = data.end_month.split('-').map(Number);
        updateData.end_month = year * 100 + month;
      }

      const { error } = await supabase
        .from('cronograma_gantt')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modern-cronograma-activities'] });
      toast({
        title: "Actividad actualizada",
        description: "Los cambios se han guardado."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la actividad.",
        variant: "destructive"
      });
    }
  });

  // Delete activity mutation
  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_gantt')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modern-cronograma-activities'] });
      toast({
        title: "Actividad eliminada",
        description: "La actividad se ha removido del cronograma."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "No se pudo eliminar la actividad.",
        variant: "destructive"
      });
    }
  });

  // Save matrix overrides mutation
  const saveMatrixOverrides = useMutation({
    mutationFn: async (overrides: Array<{
      mes: string;
      concepto: string;
      valor: string;
      sobrescribe: boolean;
    }>) => {
      if (!clienteId || !proyectoId) throw new Error('Cliente y proyecto requeridos');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const dataToInsert = overrides.map(override => {
        // Convert string month to number for database
        const [year, month] = override.mes.split('-').map(Number);
        return {
          cliente_id: clienteId,
          proyecto_id: proyectoId,
          mes: year * 100 + month,
          concepto: override.concepto,
          valor: override.valor,
          sobrescribe: override.sobrescribe,
          created_by: user.id
        };
      });

      const { error } = await supabase
        .from('cronograma_matriz_manual')
        .upsert(dataToInsert, {
          onConflict: 'cliente_id,proyecto_id,mes,concepto'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-matrix-overrides'] });
      toast({
        title: "Matriz guardada",
        description: "Los valores personalizados se han guardado correctamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la matriz.",
        variant: "destructive"
      });
    }
  });

  // Delete matrix override mutation
  const deleteMatrixOverride = useMutation({
    mutationFn: async ({ mes, concepto }: { mes: string; concepto: string }) => {
      if (!clienteId || !proyectoId) throw new Error('Cliente y proyecto requeridos');

      // Convert string month to number for database
      const [year, month] = mes.split('-').map(Number);
      const mesNumber = year * 100 + month;

      const { error } = await supabase
        .from('cronograma_matriz_manual')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId)
        .eq('mes', mesNumber)
        .eq('concepto', concepto);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-matrix-overrides'] });
      toast({
        title: "Override eliminado",
        description: "El valor personalizado se ha eliminado."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el override.",
        variant: "destructive"
      });
    }
  });

  return {
    // Data
    activities: activitiesQuery.data || [],
    mayores: mayoresQuery.data || [],
    matrixOverrides: matrixOverridesQuery.data || [],
    calculations,
    
    // Loading states
    isLoading: activitiesQuery.isLoading || mayoresQuery.isLoading,
    isMatrixLoading: matrixOverridesQuery.isLoading,
    
    // Mutations
    createActivity,
    updateActivity,
    deleteActivity,
    saveMatrixOverrides,
    deleteMatrixOverride,
    
    // Refetch
    refetch: () => {
      activitiesQuery.refetch();
      matrixOverridesQuery.refetch();
      parametricoTotalsQuery.refetch();
      paymentPlansQuery.refetch();
    }
  };
};