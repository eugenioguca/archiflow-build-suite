import { supabase } from '@/integrations/supabase/client';

export interface PlanningGanttActivity {
  id: string;
  mayor_id: string;
  mayor?: {
    id: string;
    codigo: string;
    nombre: string;
  };
  start_month: string;
  start_week: number;
  end_month: string;
  end_week: number;
  amount: number;
  start_date_plan?: string;
  end_date_plan?: string;
  nombre_actividad: string;
  importe_mayor?: number;
  orden?: number;
}

export interface GanttConstructionActivity extends PlanningGanttActivity {
  source_activity_id: string;
  estado?: 'no_iniciado' | 'en_proceso' | 'bloqueado' | 'terminado';
  avance_real_pct?: number;
  start_real?: string;
  end_real?: string;
  causa_retraso?: string;
  nota?: string;
  material_readiness?: 'solicitado' | 'listo' | 'pendiente';
}

export const getGanttByProject = async (projectId: string, clientId?: string): Promise<PlanningGanttActivity[]> => {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  // Get the gantt plan for this project
  const { data: plan, error: planError } = await supabase
    .from('cronograma_gantt_plan')
    .select('id')
    .eq('proyecto_id', projectId)
    .maybeSingle();

  if (planError) {
    throw new Error(`Error fetching gantt plan: ${planError.message}`);
  }

  if (!plan) {
    // No gantt plan exists yet, return empty array
    return [];
  }

  // Get gantt lines with activities and mayor information
  const { data: lines, error: linesError } = await supabase
    .from('cronograma_gantt_line')
    .select(`
      id,
      mayor_id,
      amount,
      order_index,
      activities:cronograma_gantt_activity(
        id,
        start_month,
        start_week,
        end_month,
        end_week
      ),
      mayor:chart_of_accounts_mayor(
        id,
        codigo,
        nombre
      )
    `)
    .eq('plan_id', plan.id)
    .eq('is_discount', false)
    .order('order_index', { ascending: true });

  if (linesError) {
    throw new Error(`Error fetching gantt lines: ${linesError.message}`);
  }

  // Convert lines to activities format
  const activities: PlanningGanttActivity[] = [];
  
  (lines || []).forEach((line, lineIndex) => {
    const activity = line.activities?.[0]; // Each line should have one activity
    
    if (activity && line.mayor) {
      // Convert month format from YYYY-MM to display format if needed
      const startMonth = activity.start_month;
      const endMonth = activity.end_month;
      
      // Calculate approximate dates for display
      const startYear = parseInt(startMonth.substring(0, 4));
      const startMonthNum = parseInt(startMonth.substring(5, 7));
      const endYear = parseInt(endMonth.substring(0, 4));
      const endMonthNum = parseInt(endMonth.substring(5, 7));
      
      // Approximate start/end dates based on week within month
      const startDate = new Date(startYear, startMonthNum - 1, (activity.start_week - 1) * 7 + 1);
      const endDate = new Date(endYear, endMonthNum - 1, activity.end_week * 7);
      
      activities.push({
        id: activity.id,
        mayor_id: line.mayor_id,
        mayor: line.mayor,
        start_month: startMonth,
        start_week: activity.start_week,
        end_month: endMonth,
        end_week: activity.end_week,
        amount: line.amount || 0,
        start_date_plan: startDate.toISOString().split('T')[0],
        end_date_plan: endDate.toISOString().split('T')[0],
        nombre_actividad: line.mayor.nombre || `Actividad ${lineIndex + 1}`,
        importe_mayor: line.amount || 0,
        orden: line.order_index || lineIndex + 1
      });
    }
  });

  return activities;
};

export const getGanttConstructionStatus = async (projectId: string): Promise<Record<string, any>> => {
  if (!projectId) {
    return {};
  }

  // Get latest status for each activity from gantt_activity_log
  const { data: logs, error } = await supabase
    .from('gantt_activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching construction logs:', error);
    return {};
  }

  // Group by source_activity_id and take the latest entry
  const statusByActivity: Record<string, any> = {};
  
  (logs || []).forEach(log => {
    if (!statusByActivity[log.source_activity_id]) {
      statusByActivity[log.source_activity_id] = {
        estado: log.estado,
        avance_real_pct: log.avance_real_pct || 0,
        start_real: log.start_real,
        end_real: log.end_real,
        causa_retraso: log.causa_retraso,
        nota: log.nota,
        updated_at: log.created_at
      };
    }
  });

  return statusByActivity;
};