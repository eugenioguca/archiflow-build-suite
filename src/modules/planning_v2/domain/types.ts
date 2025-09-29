/**
 * Domain types for Planning v2
 * All monetary values use Decimal.js for precision
 */
import { Decimal } from 'decimal.js';

export type FieldKey = string;

export type AggregationKey = 
  | 'subtotal_partida'
  | 'grand_total'
  | 'total_cantidad'
  | 'total_cantidad_real';

export type FieldRole = 'input' | 'computed';

export type FormulaScope = 'concepto' | 'partida' | 'budget';

export interface ConceptCore {
  // Identificación
  id?: string;
  partida_id: string;
  code: string | null;
  short_description: string;
  long_description: string | null;
  unit: string;
  provider: string | null;
  order_index: number;
  
  // Estado
  active: boolean;
  sumable: boolean;
  
  // Cantidades (numeric with 6 decimals)
  cantidad_real: number;
  desperdicio_pct: number;
  cantidad: number;
  
  // Precios (numeric with 6 decimals)
  precio_real: number;
  honorarios_pct: number;
  pu: number;
  
  // Totales (numeric with 6 decimals)
  total_real: number;
  total: number;
  
  // Vinculación WBS
  wbs_code: string | null;
  
  // Metadata
  props: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateField {
  id: string;
  template_id: string;
  key: FieldKey;
  label: string;
  type: string;
  role: FieldRole;
  default_value: any;
  formula: string | null;
  visible: boolean;
  helptext: string | null;
}

export interface FormulaContext {
  entity: Record<string, any>;
  scope: FormulaScope;
  fields: TemplateField[];
  allConceptos?: ConceptCore[];
  allPartidas?: any[];
}

export interface ComputationResult {
  success: boolean;
  values: Record<FieldKey, Decimal>;
  errors: Array<{
    field: FieldKey;
    message: string;
    dependencies?: FieldKey[];
  }>;
}

export interface AggregationResult {
  key: AggregationKey;
  value: Decimal;
  scope: FormulaScope;
  scopeId?: string;
}

/**
 * Field dependency graph node
 */
export interface FieldNode {
  key: FieldKey;
  formula: string | null;
  role: FieldRole;
  dependencies: FieldKey[];
}

/**
 * Computation order after topological sort
 */
export interface ComputationOrder {
  order: FieldKey[];
  cycles: FieldKey[][];
}
