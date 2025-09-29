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
}
