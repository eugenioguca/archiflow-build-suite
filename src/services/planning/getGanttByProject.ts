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

  // Use the new read-only VIEW for Planning Gantt data
  const { data: activities, error } = await supabase
    .from('v_planning_gantt_for_construction')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Error fetching gantt activities: ${error.message}`);
  }

  if (!activities || activities.length === 0) {
    return [];
  }

  // Convert VIEW data to expected format
  return activities.map((activity: any) => ({
    id: activity.source_activity_id,
    mayor_id: activity.mayor_id,
    mayor: {
      id: activity.mayor_id,
      codigo: activity.mayor_codigo,
      nombre: activity.mayor_nombre
    },
    start_month: activity.start_month,
    start_week: activity.start_week,
    end_month: activity.end_month,
    end_week: activity.end_week,
    amount: activity.amount || 0,
    start_date_plan: activity.start_date_plan,
    end_date_plan: activity.end_date_plan,
    nombre_actividad: activity.nombre_actividad,
    importe_mayor: activity.amount || 0,
    orden: activity.order_index
  }));
};

export const getGanttConstructionStatus = async (projectId: string): Promise<Record<string, any>> => {
  if (!projectId) {
    return {};
  }

  try {
    // Get latest status for each activity from gantt_activity_log
    // Using any to work around type issues until types are regenerated
    const { data: logs, error } = await supabase
      .from('gantt_activity_log' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching construction logs:', error);
      return {};
    }

    // Group by source_activity_id and take the latest entry
    const statusByActivity: Record<string, any> = {};
    
    (logs || []).forEach((log: any) => {
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
  } catch (error) {
    console.error('Error in getGanttConstructionStatus:', error);
    return {};
  }
};