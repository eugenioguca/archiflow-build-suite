/**
 * Type definitions for Planning v2 module
 */

export type BudgetStatus = 'draft' | 'published' | 'closed';

export interface PlanningBudget {
  id: string;
  project_id: string | null;
  client_id: string | null;
  name: string;
  currency: string;
  status: BudgetStatus;
  settings: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningPartida {
  id: string;
  budget_id: string;
  name: string;
  order_index: number;
  active: boolean;
  notes: string | null;
  honorarios_pct_override: number | null;
  desperdicio_pct_override: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningConcepto {
  id: string;
  partida_id: string;
  code: string | null;
  short_description: string;
  long_description: string | null;
  unit: string;
  provider: string | null;
  active: boolean;
  sumable: boolean;
  order_index: number;
  props: Record<string, any>;
  
  // Quantities
  cantidad_real: number;
  desperdicio_pct: number;
  cantidad: number;
  
  // Prices
  precio_real: number;
  honorarios_pct: number;
  pu: number;
  
  // Totals
  total_real: number;
  total: number;
  
  // WBS reference
  wbs_code: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface BudgetListItem {
  id: string;
  name: string;
  project_name: string | null;
  client_name: string | null;
  status: BudgetStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  project_id: string | null;
  client_id: string | null;
  total_amount?: number;
}

// Template types
export interface PlanningTemplate {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
}

export interface PlanningTemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  field_role: 'input' | 'computed';
  default_value: string | null;
  formula: string | null;
  visible: boolean;
  order_index: number;
  helptext: string | null;
  created_at: string;
}

export interface PlanningTemplatePartida {
  id: string;
  template_id: string;
  name: string;
  order_index: number;
  notes: string | null;
  created_at: string;
}

export interface PlanningTemplateConcepto {
  id: string;
  template_partida_id: string;
  code: string | null;
  short_description: string;
  long_description: string | null;
  unit: string;
  provider: string | null;
  order_index: number;
  sumable: boolean;
  default_values: Record<string, any>;
  created_at: string;
}

export interface PlanningTemplateTest {
  id: string;
  template_id: string;
  test_name: string;
  test_inputs: any[];
  expected_grand_total: number;
  expected_outputs: Record<string, any> | null;
  last_run_status: 'passed' | 'failed' | 'not_run' | null;
  last_run_at: string | null;
  last_run_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateDelta {
  partidas_to_add: PlanningTemplatePartida[];
  conceptos_to_add: Array<{
    partida_name: string;
    concepto: PlanningTemplateConcepto;
  }>;
  fields_to_add: PlanningTemplateField[];
  existing_conceptos_to_update: Array<{
    concepto_id: string;
    updates: Partial<PlanningConcepto>;
  }>;
}

export interface TestRunResult {
  test_id: string;
  test_name: string;
  passed: boolean;
  actual_grand_total: number;
  expected_grand_total: number;
  difference: number;
  field_results?: Array<{
    field_key: string;
    expected: any;
    actual: any;
    passed: boolean;
  }>;
  error?: string;
}

// Phase 8: Permissions, Audit, Events
export type PlanningV2Role = 'viewer' | 'editor' | 'publisher';

export interface PlanningV2UserRole {
  id: string;
  user_id: string;
  role: PlanningV2Role;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  notes: string | null;
}

export interface PlanningV2AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string;
  changed_at: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  budget_id: string | null;
  change_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
}

export interface PlanningV2Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  metadata: Record<string, any>;
}

export interface PlanningV2Event {
  id: string;
  event_type: string;
  budget_id: string | null;
  snapshot_id: string | null;
  triggered_by: string;
  triggered_at: string;
  payload: Record<string, any>;
  webhooks_sent: number;
  webhooks_failed: number;
  metadata: Record<string, any>;
}
