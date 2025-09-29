/**
 * Events Service - Planning v2
 * 
 * Manage webhooks and events
 */

import { supabase } from '@/integrations/supabase/client';
import type { PlanningV2Webhook, PlanningV2Event } from '../types';
import { PLANNING_V2_ENABLED } from '../config/featureFlag';

// ==================== Webhook Management ====================

export async function getWebhooks() {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data, error } = await supabase
    .from('planning_v2_webhooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as PlanningV2Webhook[];
}

export async function createWebhook(webhook: {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  metadata?: Record<string, any>;
}) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('planning_v2_webhooks')
    .insert({
      ...webhook,
      created_by: profile?.id
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PlanningV2Webhook;
}

export async function updateWebhook(
  webhookId: string,
  updates: Partial<PlanningV2Webhook>
) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data, error } = await supabase
    .from('planning_v2_webhooks')
    .update(updates)
    .eq('id', webhookId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PlanningV2Webhook;
}

export async function deleteWebhook(webhookId: string) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { error } = await supabase
    .from('planning_v2_webhooks')
    .delete()
    .eq('id', webhookId);

  if (error) throw error;
}

export async function toggleWebhook(webhookId: string, isActive: boolean) {
  return updateWebhook(webhookId, { is_active: isActive });
}

// ==================== Event Management ====================

export async function getEvents(filters?: {
  budgetId?: string;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  let query = supabase
    .from('planning_v2_events')
    .select(`
      *,
      triggered_by_profile:profiles!planning_v2_events_triggered_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .order('triggered_at', { ascending: false });

  if (filters?.budgetId) {
    query = query.eq('budget_id', filters.budgetId);
  }

  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }

  if (filters?.startDate) {
    query = query.gte('triggered_at', filters.startDate.toISOString());
  }

  if (filters?.endDate) {
    query = query.lte('triggered_at', filters.endDate.toISOString());
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(50);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as (PlanningV2Event & {
    triggered_by_profile: any;
  })[];
}

export async function triggerEvent(
  eventType: string,
  budgetId: string | null,
  snapshotId: string | null,
  payload: Record<string, any>
) {
  if (!PLANNING_V2_ENABLED) {
    throw new Error('Planning v2 no está habilitado');
  }

  const { data, error } = await supabase.rpc('trigger_planning_v2_event', {
    p_event_type: eventType,
    p_budget_id: budgetId,
    p_snapshot_id: snapshotId,
    p_payload: payload
  });

  if (error) throw error;

  // Llamar a edge function para enviar webhooks
  if (data) {
    try {
      await supabase.functions.invoke('planning-v2-webhooks', {
        body: { event_id: data }
      });
    } catch (webhookError) {
      console.error('Error al enviar webhooks:', webhookError);
      // No falla la operación principal si los webhooks fallan
    }
  }

  return data;
}

// ==================== Event Helpers ====================

export async function triggerBudgetPublishedEvent(
  budgetId: string,
  snapshotId: string,
  totals: Record<string, any>
) {
  return triggerEvent(
    'planning_v2.budget.published',
    budgetId,
    snapshotId,
    {
      budget_id: budgetId,
      snapshot_id: snapshotId,
      totals,
      published_at: new Date().toISOString()
    }
  );
}

export async function triggerBudgetExportedEvent(
  budgetId: string,
  exportFormat: 'pdf' | 'excel',
  exportData: Record<string, any>
) {
  return triggerEvent(
    'planning_v2.budget.exported',
    budgetId,
    null,
    {
      budget_id: budgetId,
      format: exportFormat,
      exported_at: new Date().toISOString(),
      ...exportData
    }
  );
}
