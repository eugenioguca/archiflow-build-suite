import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActivityUpdateData {
  progress_percentage?: number;
  status?: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  actual_duration_days?: number;
  cost_actual?: number;
  notes?: string;
}

export function useActivityUpdate() {
  const [updating, setUpdating] = useState(false);

  const updateActivity = async (activityId: string, updates: ActivityUpdateData) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('construction_timeline')
        .update(updates)
        .eq('id', activityId);

      if (error) throw error;

      toast.success('Actividad actualizada correctamente');
      return true;
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Error al actualizar la actividad');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const updateActivityProgress = async (activityId: string, progress: number) => {
    const updates: ActivityUpdateData = {
      progress_percentage: Math.max(0, Math.min(100, progress))
    };

    // Auto-calculate status based on progress
    if (progress === 0) {
      updates.status = 'not_started';
    } else if (progress === 100) {
      updates.status = 'completed';
      updates.actual_end_date = new Date().toISOString().split('T')[0];
    } else {
      updates.status = 'in_progress';
      if (!updates.actual_start_date) {
        updates.actual_start_date = new Date().toISOString().split('T')[0];
      }
    }

    return updateActivity(activityId, updates);
  };

  const updateActivityStatus = async (activityId: string, status: string) => {
    const updates: ActivityUpdateData = { status };

    // Auto-adjust progress based on status
    if (status === 'not_started') {
      updates.progress_percentage = 0;
      updates.actual_start_date = null;
      updates.actual_end_date = null;
    } else if (status === 'completed') {
      updates.progress_percentage = 100;
      updates.actual_end_date = new Date().toISOString().split('T')[0];
    } else if (status === 'in_progress') {
      if (!updates.actual_start_date) {
        updates.actual_start_date = new Date().toISOString().split('T')[0];
      }
    }

    return updateActivity(activityId, updates);
  };

  return {
    updating,
    updateActivity,
    updateActivityProgress,
    updateActivityStatus
  };
}