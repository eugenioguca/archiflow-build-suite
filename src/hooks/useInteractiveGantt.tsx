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

  // Convert database format to GanttBar format
      return (data || []).map(item => {
        const startDate = new Date(item.fecha_inicio);
        const endDate = new Date(item.fecha_fin);
        const baseDate = new Date();
        baseDate.setDate(1); // Start from first day of current month
        
        const startMonthDiff = (startDate.getFullYear() - baseDate.getFullYear()) * 12 + (startDate.getMonth() - baseDate.getMonth()) + 1;
        const endMonthDiff = (endDate.getFullYear() - baseDate.getFullYear()) * 12 + (endDate.getMonth() - baseDate.getMonth()) + 1;
        
        // Calculate week within month (1-4)
        const startWeek = Math.ceil(startDate.getDate() / 7);
        const endWeek = Math.ceil(endDate.getDate() / 7);
        
        const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const durationWeeks = Math.ceil(durationInDays / 7);
        
        return {
          ...item,
          start_month: Math.max(1, startMonthDiff),
          start_week: Math.min(4, Math.max(1, startWeek)),
          end_month: Math.max(1, endMonthDiff),
          end_week: Math.min(4, Math.max(1, endWeek)),
          duration_weeks: Math.max(1, durationWeeks),
          departamento_id: item.departamento
        };
      }) as GanttBar[];
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

      // Determine if we're getting form data or processed bar data
      let insertData;
      
      if (data.fecha_inicio && data.fecha_fin) {
        // This is form data from the modal
        insertData = {
          cliente_id: data.cliente_id,
          proyecto_id: data.proyecto_id,
          departamento: data.departamento_id,
          mayor_id: data.mayor_id,
          fecha_inicio: data.fecha_inicio.toISOString().split('T')[0],
          fecha_fin: data.fecha_fin.toISOString().split('T')[0],
          duracion: data.duracion_dias,
          created_by: profile.id
        };
      } else {
        // This is processed bar data from drag/drop
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (data.start_month - 1), (data.start_week - 1) * 7 + 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (data.end_month - 1), (data.end_week - 1) * 7 + 7);
        const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        insertData = {
          cliente_id: data.cliente_id,
          proyecto_id: data.proyecto_id,
          departamento: data.departamento_id,
          mayor_id: data.mayor_id,
          fecha_inicio: startDate.toISOString().split('T')[0],
          fecha_fin: endDate.toISOString().split('T')[0],
          duracion: durationInDays,
          created_by: profile.id
        };
      }

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
      
      if (data.start_month !== undefined || data.start_week !== undefined || data.end_month !== undefined || data.end_week !== undefined) {
        // Convert weeks and months back to actual dates
        const currentDate = new Date();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + ((data.start_month || 1) - 1), ((data.start_week || 1) - 1) * 7 + 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + ((data.end_month || 1) - 1), ((data.end_week || 1) - 1) * 7 + 7);
        
        const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        updates.fecha_inicio = startDate.toISOString().split('T')[0];
        updates.fecha_fin = endDate.toISOString().split('T')[0];
        updates.duracion = durationInDays;
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

    // Calculate monthly spend from bars (automatic values)
    const gastoPorMesAuto: Record<number, number> = {};
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
        
        gastoPorMesAuto[month] = (gastoPorMesAuto[month] || 0) + (monthlyAmount * weeksInMonth);
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