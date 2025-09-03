import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GanttBar {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  departamento_id: string;
  mayor_id: string;
  start_month: number;
  start_week: number;
  end_month: number;
  end_week: number;
  duration_weeks: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  mayor?: { codigo: string; nombre: string };
}

export interface MonthlyCalculations {
  gastoPorMes: Record<number, number>;
  avanceParcial: Record<number, number>;
  avanceAcumulado: Record<number, number>;
  ministraciones: Record<number, number>;
  inversionAcumulada: Record<number, number>;
  fechasPago: Record<number, string[]>;
  totalPresupuesto: number;
}

export const useInteractiveGantt = (clienteId?: string, proyectoId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Gantt bars
  const ganttBarsQuery = useQuery({
    queryKey: ['gantt-bars', clienteId, proyectoId],
    queryFn: async () => {
      let query = supabase
        .from('cronograma_gantt')
        .select(`
          *,
          mayor:chart_of_accounts_mayor(codigo, nombre)
        `)
        .order('created_at', { ascending: true });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      
      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Convert database format to GanttBar format
      return (data || []).map(item => ({
        ...item,
        start_month: Math.floor((new Date(item.fecha_inicio).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1,
        start_week: 1,
        end_month: Math.floor((new Date(item.fecha_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1,
        end_week: 4,
        duration_weeks: Math.floor(item.duracion / 7),
        departamento_id: item.departamento
      })) as GanttBar[];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Fetch mayores for construction department
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
    enabled: true,
  });

  // Fetch presupuesto parametrico totals
  const presupuestoQuery = useQuery({
    queryKey: ['presupuesto-totals', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return [];
      
      const { data, error } = await supabase
        .from('presupuesto_parametrico')
        .select('mayor_id, monto_total')
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Fetch payment plans for ministraciones
  const paymentPlansQuery = useQuery({
    queryKey: ['payment-plans-construction', proyectoId],
    queryFn: async () => {
      if (!proyectoId) return [];
      
      const { data, error } = await supabase
        .from('payment_plans')
        .select(`
          *,
          payment_installments(*)
        `)
        .eq('client_project_id', proyectoId)
        .eq('plan_type', 'construction_payment')
        .eq('is_current_plan', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!proyectoId,
  });

  // Create Gantt bar
  const createGanttBar = useMutation({
    mutationFn: async (data: Omit<GanttBar, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'mayor'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Convert weeks to dates (approximation)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (data.start_month - 1) * 30 + (data.start_week - 1) * 7);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + data.duration_weeks * 7);

      const { data: result, error } = await supabase
        .from('cronograma_gantt')
        .insert({
          cliente_id: data.cliente_id,
          proyecto_id: data.proyecto_id,
          departamento: data.departamento_id,
          mayor_id: data.mayor_id,
          fecha_inicio: startDate.toISOString().split('T')[0],
          fecha_fin: endDate.toISOString().split('T')[0],
          duracion: data.duration_weeks * 7,
          created_by: profile.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-bars'] });
      toast({
        title: "Actividad creada",
        description: "La actividad del cronograma se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error creating gantt bar:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la actividad del cronograma.",
        variant: "destructive",
      });
    },
  });

  // Update Gantt bar
  const updateGanttBar = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GanttBar> }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      
      if (data.start_month !== undefined || data.start_week !== undefined || data.duration_weeks !== undefined) {
        // Convert weeks back to dates
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + ((data.start_month || 1) - 1) * 30 + ((data.start_week || 1) - 1) * 7);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (data.duration_weeks || 1) * 7);
        
        updates.fecha_inicio = startDate.toISOString().split('T')[0];
        updates.fecha_fin = endDate.toISOString().split('T')[0];
        updates.duracion = (data.duration_weeks || 1) * 7;
      }

      const { data: result, error } = await supabase
        .from('cronograma_gantt')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-bars'] });
      toast({
        title: "Actividad actualizada",
        description: "La actividad del cronograma se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error updating gantt bar:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la actividad del cronograma.",
        variant: "destructive",
      });
    },
  });

  // Delete Gantt bar
  const deleteGanttBar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cronograma_gantt')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-bars'] });
      toast({
        title: "Actividad eliminada",
        description: "La actividad del cronograma se ha eliminado.",
      });
    },
    onError: (error) => {
      console.error('Error deleting gantt bar:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la actividad del cronograma.",
        variant: "destructive",
      });
    },
  });

  // Calculate monthly values
  const calculateMonthlyData = useCallback((): MonthlyCalculations => {
    const bars = ganttBarsQuery.data || [];
    const presupuestoTotals = presupuestoQuery.data || [];
    const paymentPlans = paymentPlansQuery.data || [];

    // Create totals by mayor
    const totalsByMayor: Record<string, number> = {};
    presupuestoTotals.forEach(item => {
      totalsByMayor[item.mayor_id] = (totalsByMayor[item.mayor_id] || 0) + item.monto_total;
    });

    const totalPresupuesto = Object.values(totalsByMayor).reduce((sum, val) => sum + val, 0);

    // Calculate monthly spend from bars
    const gastoPorMes: Record<number, number> = {};
    bars.forEach(bar => {
      const mayorTotal = totalsByMayor[bar.mayor_id] || 0;
      if (mayorTotal === 0 || bar.duration_weeks === 0) return;

      const monthlyAmount = mayorTotal / bar.duration_weeks;
      for (let month = bar.start_month; month <= bar.end_month; month++) {
        let weeksInMonth = 4; // Default
        if (month === bar.start_month && month === bar.end_month) {
          weeksInMonth = bar.end_week - bar.start_week + 1;
        } else if (month === bar.start_month) {
          weeksInMonth = 5 - bar.start_week;
        } else if (month === bar.end_month) {
          weeksInMonth = bar.end_week;
        }
        
        gastoPorMes[month] = (gastoPorMes[month] || 0) + (monthlyAmount * weeksInMonth);
      }
    });

    // Calculate advance percentages
    const avanceParcial: Record<number, number> = {};
    const avanceAcumulado: Record<number, number> = {};
    let acumulado = 0;

    Object.keys(gastoPorMes).sort((a, b) => Number(a) - Number(b)).forEach(monthStr => {
      const month = Number(monthStr);
      const parcial = totalPresupuesto > 0 ? (gastoPorMes[month] / totalPresupuesto) * 100 : 0;
      avanceParcial[month] = parcial;
      acumulado += parcial;
      avanceAcumulado[month] = Math.min(acumulado, 100);
    });

    // Calculate ministraciones from payment plans
    const ministraciones: Record<number, number> = {};
    const fechasPago: Record<number, string[]> = {};
    
    paymentPlans.forEach(plan => {
      if (plan.payment_installments) {
        plan.payment_installments.forEach((installment: any) => {
          if (installment.due_date) {
            const date = new Date(installment.due_date);
            const month = date.getMonth() + 1; // Convert to 1-based month
            ministraciones[month] = (ministraciones[month] || 0) + installment.amount;
            
            if (!fechasPago[month]) fechasPago[month] = [];
            fechasPago[month].push(installment.installment_name || `Pago ${installment.installment_number}`);
          }
        });
      }
    });

    // Calculate investment percentages
    const inversionAcumulada: Record<number, number> = {};
    let acumuladoInversion = 0;
    
    Object.keys(ministraciones).sort((a, b) => Number(a) - Number(b)).forEach(monthStr => {
      const month = Number(monthStr);
      acumuladoInversion += ministraciones[month];
      inversionAcumulada[month] = totalPresupuesto > 0 ? (acumuladoInversion / totalPresupuesto) * 100 : 0;
    });

    return {
      gastoPorMes,
      avanceParcial,
      avanceAcumulado,
      ministraciones,
      inversionAcumulada,
      fechasPago,
      totalPresupuesto
    };
  }, [ganttBarsQuery.data, presupuestoQuery.data, paymentPlansQuery.data]);

  return {
    ganttBars: ganttBarsQuery.data || [],
    mayores: mayoresQuery.data || [],
    isLoading: ganttBarsQuery.isLoading || mayoresQuery.isLoading,
    isError: ganttBarsQuery.isError || mayoresQuery.isError,
    error: ganttBarsQuery.error || mayoresQuery.error,
    monthlyCalculations: calculateMonthlyData(),
    createGanttBar,
    updateGanttBar,
    deleteGanttBar,
    refetch: () => {
      ganttBarsQuery.refetch();
      mayoresQuery.refetch();
      presupuestoQuery.refetch();
      paymentPlansQuery.refetch();
    }
  };
};