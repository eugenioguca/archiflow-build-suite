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

export interface ManualOverride {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  mes: number;
  concepto: 'gasto_obra' | 'avance_parcial' | 'avance_acumulado' | 'ministraciones' | 'inversion_acumulada' | 'fecha_pago';
  valor: string;
  sobrescribe: boolean;
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

      // Use new month+week fields directly from database
      return (data || []).map(item => ({
        ...item,
        departamento_id: item.departamento,
        // Use new fields if available, otherwise fallback to calculated values
        start_month: item.start_month || 1,
        start_week: item.start_week || 1,
        end_month: item.end_month || 1,
        end_week: item.end_week || 1,
        duration_weeks: item.duration_weeks || 1,
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

  // Fetch manual overrides for matrix
  const manualOverridesQuery = useQuery({
    queryKey: ['cronograma-manual-overrides', clienteId, proyectoId],
    queryFn: async () => {
      if (!clienteId || !proyectoId) return [];
      
      const { data, error } = await supabase
        .from('cronograma_matriz_manual')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId)
        .eq('sobrescribe', true)
        .order('mes', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId && !!proyectoId,
  });

  // Create Gantt bar
  const createGanttBar = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Use new month+week model but include deprecated fields for compatibility
      const insertData = {
        cliente_id: data.cliente_id,
        proyecto_id: data.proyecto_id,
        departamento: data.departamento_id,
        mayor_id: data.mayor_id,
        start_month: data.start_month,
        start_week: data.start_week,
        end_month: data.end_month,
        end_week: data.end_week,
        duration_weeks: data.duration_weeks,
        // Include deprecated fields for compatibility
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date().toISOString().split('T')[0],
        created_by: profile.id
      };

      const { data: result, error } = await supabase
        .from('cronograma_gantt')
        .insert(insertData)
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
      
      // Update month+week fields directly
      if (data.start_month !== undefined) updates.start_month = data.start_month;
      if (data.start_week !== undefined) updates.start_week = data.start_week;
      if (data.end_month !== undefined) updates.end_month = data.end_month;
      if (data.end_week !== undefined) updates.end_week = data.end_week;
      if (data.duration_weeks !== undefined) updates.duration_weeks = data.duration_weeks;

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

  // Save manual override
  const saveManualOverride = useMutation({
    mutationFn: async (data: {
      mes: number;
      concepto: string;
      valor: string;
    }) => {
      if (!clienteId || !proyectoId) throw new Error('Cliente y Proyecto requeridos');

      const { data: result, error } = await supabase
        .from('cronograma_matriz_manual')
        .upsert({
          cliente_id: clienteId,
          proyecto_id: proyectoId,
          mes: data.mes,
          concepto: data.concepto,
          valor: data.valor,
          sobrescribe: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-manual-overrides'] });
      toast({
        title: "Valor actualizado",
        description: "El valor manual se ha guardado exitosamente.",
      });
    },
    onError: (error) => {
      console.error('Error saving manual override:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el valor manual.",
        variant: "destructive",
      });
    },
  });

  // Delete manual override
  const deleteManualOverride = useMutation({
    mutationFn: async (data: { mes: number; concepto: string }) => {
      if (!clienteId || !proyectoId) throw new Error('Cliente y Proyecto requeridos');

      const { error } = await supabase
        .from('cronograma_matriz_manual')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('proyecto_id', proyectoId)
        .eq('mes', data.mes)
        .eq('concepto', data.concepto);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma-manual-overrides'] });
      toast({
        title: "Valor restaurado",
        description: "Se ha restaurado el valor automático.",
      });
    },
    onError: (error) => {
      console.error('Error deleting manual override:', error);
      toast({
        title: "Error",
        description: "No se pudo restaurar el valor automático.",
        variant: "destructive",
      });
    },
  });

  // Calculate monthly values
  const calculateMonthlyData = useCallback((): MonthlyCalculations => {
    const bars = ganttBarsQuery.data || [];
    const presupuestoTotals = presupuestoQuery.data || [];
    const paymentPlans = paymentPlansQuery.data || [];
    const manualOverrides = manualOverridesQuery.data || [];

    // Create map of manual overrides for quick lookup
    const overrideMap: Record<string, string> = {};
    manualOverrides.forEach(override => {
      const key = `${override.mes}-${override.concepto}`;
      overrideMap[key] = override.valor;
    });

    // Create totals by mayor
    const totalsByMayor: Record<string, number> = {};
    presupuestoTotals.forEach(item => {
      totalsByMayor[item.mayor_id] = (totalsByMayor[item.mayor_id] || 0) + item.monto_total;
    });

    const totalPresupuesto = Object.values(totalsByMayor).reduce((sum, val) => sum + val, 0);

    // Calculate monthly spend from bars using month+week model (automatic values)
    const gastoPorMesAuto: Record<number, number> = {};
    bars.forEach(bar => {
      const mayorTotal = totalsByMayor[bar.mayor_id] || 0;
      if (mayorTotal === 0 || bar.duration_weeks === 0) return;

      // Distribute budget evenly across the duration weeks
      const weeklyAmount = mayorTotal / bar.duration_weeks;
      
      // Calculate weeks for each month in the range
      for (let month = bar.start_month; month <= bar.end_month; month++) {
        let weeksInMonth = 0;
        
        if (month === bar.start_month && month === bar.end_month) {
          // Activity starts and ends in the same month
          weeksInMonth = bar.end_week - bar.start_week + 1;
        } else if (month === bar.start_month) {
          // First month: from start_week to week 4
          weeksInMonth = 5 - bar.start_week;
        } else if (month === bar.end_month) {
          // Last month: from week 1 to end_week
          weeksInMonth = bar.end_week;
        } else {
          // Middle months: all 4 weeks
          weeksInMonth = 4;
        }
        
        gastoPorMesAuto[month] = (gastoPorMesAuto[month] || 0) + (weeklyAmount * weeksInMonth);
      }
    });

    // Apply manual overrides for gasto_obra
    const gastoPorMes: Record<number, number> = {};
    Object.keys(gastoPorMesAuto).forEach(monthStr => {
      const month = Number(monthStr);
      const overrideKey = `${month}-gasto_obra`;
      if (overrideMap[overrideKey]) {
        gastoPorMes[month] = parseFloat(overrideMap[overrideKey]) || 0;
      } else {
        gastoPorMes[month] = gastoPorMesAuto[month];
      }
    });

    // Calculate advance percentages (with manual overrides)
    const avanceParcialAuto: Record<number, number> = {};
    const avanceAcumuladoAuto: Record<number, number> = {};
    let acumuladoAuto = 0;

    Object.keys(gastoPorMes).sort((a, b) => Number(a) - Number(b)).forEach(monthStr => {
      const month = Number(monthStr);
      const parcial = totalPresupuesto > 0 ? (gastoPorMes[month] / totalPresupuesto) * 100 : 0;
      avanceParcialAuto[month] = parcial;
      acumuladoAuto += parcial;
      avanceAcumuladoAuto[month] = Math.min(acumuladoAuto, 100);
    });

    // Apply manual overrides for percentages
    const avanceParcial: Record<number, number> = {};
    const avanceAcumulado: Record<number, number> = {};
    
    Object.keys(avanceParcialAuto).forEach(monthStr => {
      const month = Number(monthStr);
      const parcialKey = `${month}-avance_parcial`;
      const acumuladoKey = `${month}-avance_acumulado`;
      
      if (overrideMap[parcialKey]) {
        avanceParcial[month] = parseFloat(overrideMap[parcialKey]) || 0;
      } else {
        avanceParcial[month] = avanceParcialAuto[month];
      }
      
      if (overrideMap[acumuladoKey]) {
        avanceAcumulado[month] = parseFloat(overrideMap[acumuladoKey]) || 0;
      } else {
        avanceAcumulado[month] = avanceAcumuladoAuto[month];
      }
    });

    // Calculate ministraciones from payment plans (with manual overrides)
    const ministracionesAuto: Record<number, number> = {};
    const fechasPago: Record<number, string[]> = {};
    
    paymentPlans.forEach(plan => {
      if (plan.payment_installments) {
        plan.payment_installments.forEach((installment: any) => {
          if (installment.due_date) {
            const date = new Date(installment.due_date);
            const month = date.getMonth() + 1; // Convert to 1-based month
            ministracionesAuto[month] = (ministracionesAuto[month] || 0) + installment.amount;
            
            if (!fechasPago[month]) fechasPago[month] = [];
            fechasPago[month].push(installment.installment_name || `Pago ${installment.installment_number}`);
          }
        });
      }
    });

    // Apply manual overrides for ministraciones and fechas
    const ministraciones: Record<number, number> = {};
    Object.keys(ministracionesAuto).forEach(monthStr => {
      const month = Number(monthStr);
      const overrideKey = `${month}-ministraciones`;
      const fechaKey = `${month}-fecha_pago`;
      
      if (overrideMap[overrideKey]) {
        ministraciones[month] = parseFloat(overrideMap[overrideKey]) || 0;
      } else {
        ministraciones[month] = ministracionesAuto[month];
      }
      
      if (overrideMap[fechaKey]) {
        fechasPago[month] = [overrideMap[fechaKey]];
      }
    });

    // Calculate investment percentages (with manual overrides)
    const inversionAcumuladaAuto: Record<number, number> = {};
    let acumuladoInversionAuto = 0;
    
    Object.keys(ministraciones).sort((a, b) => Number(a) - Number(b)).forEach(monthStr => {
      const month = Number(monthStr);
      acumuladoInversionAuto += ministraciones[month];
      inversionAcumuladaAuto[month] = totalPresupuesto > 0 ? (acumuladoInversionAuto / totalPresupuesto) * 100 : 0;
    });

    // Apply manual overrides for investment percentages
    const inversionAcumulada: Record<number, number> = {};
    Object.keys(inversionAcumuladaAuto).forEach(monthStr => {
      const month = Number(monthStr);
      const overrideKey = `${month}-inversion_acumulada`;
      
      if (overrideMap[overrideKey]) {
        inversionAcumulada[month] = parseFloat(overrideMap[overrideKey]) || 0;
      } else {
        inversionAcumulada[month] = inversionAcumuladaAuto[month];
      }
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
  }, [ganttBarsQuery.data, presupuestoQuery.data, paymentPlansQuery.data, manualOverridesQuery.data]);

  // Get manual overrides for use in matrix
  const getManualOverrides = useCallback(() => {
    const overrides = manualOverridesQuery.data || [];
    const overrideMap: Record<string, { valor: string; hasOverride: boolean }> = {};
    
    overrides.forEach(override => {
      const key = `${override.mes}-${override.concepto}`;
      overrideMap[key] = { 
        valor: override.valor, 
        hasOverride: true 
      };
    });
    
    return overrideMap;
  }, [manualOverridesQuery.data]);

  return {
    ganttBars: ganttBarsQuery.data || [],
    mayores: mayoresQuery.data || [],
    isLoading: ganttBarsQuery.isLoading || mayoresQuery.isLoading,
    isError: ganttBarsQuery.isError || mayoresQuery.isError,
    error: ganttBarsQuery.error || mayoresQuery.error,
    monthlyCalculations: calculateMonthlyData(),
    manualOverrides: getManualOverrides(),
    createGanttBar,
    updateGanttBar,
    deleteGanttBar,
    saveManualOverride,
    deleteManualOverride,
    refetch: () => {
      ganttBarsQuery.refetch();
      mayoresQuery.refetch();
      presupuestoQuery.refetch();
      paymentPlansQuery.refetch();
      manualOverridesQuery.refetch();
    }
  };
};