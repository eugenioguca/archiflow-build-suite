/**
 * Audit Service - Planning v2
 * 
 * Query and manage audit logs
 */

import { supabase } from '@/integrations/supabase/client';
import type { PlanningV2AuditLog } from '../types';
import { PLANNING_V2_ENABLED } from '../config/featureFlag';

// ==================== Query Audit Logs ====================

export async function getAuditLogs(filters?: {
  budgetId?: string;
  recordId?: string;
  tableName?: string;
  changedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  let query = supabase
    .from('planning_v2_audit_log')
    .select(`
      *,
      changed_by_profile:profiles!planning_v2_audit_log_changed_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .order('changed_at', { ascending: false });

  if (filters?.budgetId) {
    query = query.eq('budget_id', filters.budgetId);
  }

  if (filters?.recordId) {
    query = query.eq('record_id', filters.recordId);
  }

  if (filters?.tableName) {
    query = query.eq('table_name', filters.tableName);
  }

  if (filters?.changedBy) {
    query = query.eq('changed_by', filters.changedBy);
  }

  if (filters?.startDate) {
    query = query.gte('changed_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('changed_at', filters.endDate.toISOString());
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as (PlanningV2AuditLog & {
    changed_by_profile: any;
  })[];
}

export async function getAuditLogsForRecord(
  tableName: string,
  recordId: string
) {
  return getAuditLogs({ tableName, recordId });
}

export async function getAuditLogsForBudget(
  budgetId: string,
  limit?: number
) {
  return getAuditLogs({ budgetId, limit });
}

export async function getRecentChanges(limit: number = 50) {
  return getAuditLogs({ limit });
}

// ==================== Audit Log Analysis ====================

export interface AuditSummary {
  total_changes: number;
  changes_by_user: Record<string, number>;
  changes_by_table: Record<string, number>;
  most_active_day: string | null;
  most_changed_field: string | null;
}

export async function getAuditSummary(
  budgetId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<AuditSummary> {
  const logs = await getAuditLogs({
    budgetId,
    startDate,
    endDate,
    limit: 1000
  });

  const summary: AuditSummary = {
    total_changes: logs.length,
    changes_by_user: {},
    changes_by_table: {},
    most_active_day: null,
    most_changed_field: null
  };

  const dayCount: Record<string, number> = {};
  const fieldCount: Record<string, number> = {};

  logs.forEach((log) => {
    // Por usuario
    const userName = log.changed_by_profile?.full_name || 'Desconocido';
    summary.changes_by_user[userName] = (summary.changes_by_user[userName] || 0) + 1;

    // Por tabla
    summary.changes_by_table[log.table_name] = (summary.changes_by_table[log.table_name] || 0) + 1;

    // Por día
    const day = log.changed_at.split('T')[0];
    dayCount[day] = (dayCount[day] || 0) + 1;

    // Por campo
    if (log.field_name) {
      fieldCount[log.field_name] = (fieldCount[log.field_name] || 0) + 1;
    }
  });

  // Encontrar día más activo
  let maxDayCount = 0;
  Object.entries(dayCount).forEach(([day, count]) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      summary.most_active_day = day;
    }
  });

  // Encontrar campo más modificado
  let maxFieldCount = 0;
  Object.entries(fieldCount).forEach(([field, count]) => {
    if (count > maxFieldCount) {
      maxFieldCount = count;
      summary.most_changed_field = field;
    }
  });

  return summary;
}

// ==================== Manual Logging (for non-trigger scenarios) ====================

export async function logManualChange(
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  fieldName?: string,
  oldValue?: string,
  newValue?: string,
  budgetId?: string,
  changeReason?: string
) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data, error } = await supabase.rpc('log_planning_v2_change', {
    p_table_name: tableName,
    p_record_id: recordId,
    p_action: action,
    p_field_name: fieldName || null,
    p_old_value: oldValue || null,
    p_new_value: newValue || null,
    p_budget_id: budgetId || null,
    p_change_reason: changeReason || null
  });

  if (error) throw error;
  return data;
}
