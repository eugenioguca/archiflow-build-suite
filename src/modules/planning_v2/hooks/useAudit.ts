/**
 * useAudit Hook - Planning v2
 * 
 * Query and manage audit logs
 */

import { useQuery } from '@tanstack/react-query';
import * as auditService from '../services/auditService';

export function useAudit(filters?: {
  budgetId?: string;
  recordId?: string;
  tableName?: string;
  changedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  // Query audit logs
  const auditLogsQuery = useQuery({
    queryKey: ['planning-v2-audit-logs', filters],
    queryFn: () => auditService.getAuditLogs(filters),
    enabled: !!filters
  });

  // Query audit summary
  const auditSummaryQuery = useQuery({
    queryKey: ['planning-v2-audit-summary', filters?.budgetId, filters?.startDate, filters?.endDate],
    queryFn: () => auditService.getAuditSummary(
      filters?.budgetId,
      filters?.startDate,
      filters?.endDate
    ),
    enabled: !!filters
  });

  return {
    // Data
    auditLogs: auditLogsQuery.data,
    auditSummary: auditSummaryQuery.data,
    
    // Loading states
    isLoading: auditLogsQuery.isLoading || auditSummaryQuery.isLoading,
    
    // Refetch
    refetch: auditLogsQuery.refetch
  };
}

export function useRecordAudit(tableName?: string, recordId?: string) {
  return useQuery({
    queryKey: ['planning-v2-record-audit', tableName, recordId],
    queryFn: () => auditService.getAuditLogsForRecord(tableName!, recordId!),
    enabled: !!tableName && !!recordId
  });
}

export function useBudgetAudit(budgetId?: string, limit?: number) {
  return useQuery({
    queryKey: ['planning-v2-budget-audit', budgetId, limit],
    queryFn: () => auditService.getAuditLogsForBudget(budgetId!, limit),
    enabled: !!budgetId
  });
}

export function useRecentChanges(limit: number = 50) {
  return useQuery({
    queryKey: ['planning-v2-recent-changes', limit],
    queryFn: () => auditService.getRecentChanges(limit)
  });
}
