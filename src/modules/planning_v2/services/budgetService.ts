/**
 * Budget service for Planning v2
 * CRUD operations for budgets, partidas, and conceptos
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlanningBudget, PlanningPartida, PlanningConcepto } from '../types';
import { computeFields } from '../engine/formulaEngine';
import type { ConceptCore, FormulaContext } from '../domain/types';

/**
 * Get all budgets
 */
export async function getBudgets() {
  const { data, error } = await supabase
    .from('planning_budgets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PlanningBudget[];
}

/**
 * Get budget by ID with partidas and conceptos
 */
export async function getBudgetById(id: string) {
  const { data: budget, error: budgetError } = await supabase
    .from('planning_budgets')
    .select('*')
    .eq('id', id)
    .single();

  if (budgetError) throw budgetError;

  const { data: partidas, error: partidasError } = await supabase
    .from('planning_partidas')
    .select('*')
    .eq('budget_id', id)
    .order('order_index');

  if (partidasError) throw partidasError;

  const { data: conceptos, error: conceptosError } = await supabase
    .from('planning_conceptos')
    .select('*')
    .in('partida_id', partidas.map(p => p.id))
    .order('order_index');

  if (conceptosError) throw conceptosError;

  return {
    budget: budget as PlanningBudget,
    partidas: partidas as PlanningPartida[],
    conceptos: conceptos as PlanningConcepto[],
  };
}

/**
 * Create new budget
 */
export async function createBudget(
  budget: Omit<PlanningBudget, 'id' | 'created_at' | 'updated_at' | 'created_by'>
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('planning_budgets')
    .insert({
      ...budget,
      created_by: user.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlanningBudget;
}

/**
 * Update budget
 */
export async function updateBudget(id: string, updates: Partial<PlanningBudget>) {
  const { data, error } = await supabase
    .from('planning_budgets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningBudget;
}

/**
 * Delete budget (deprecated - use moveToTrash instead)
 */
export async function deleteBudget(id: string) {
  const { error } = await supabase
    .from('planning_budgets')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Soft delete a budget (move to trash)
 */
export async function moveToTrash(id: string): Promise<void> {
  const { error } = await supabase
    .from('planning_budgets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Restore a budget from trash
 */
export async function restoreBudget(id: string): Promise<void> {
  const { error } = await supabase
    .from('planning_budgets')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Permanently delete a budget (hard delete)
 * Should only be allowed for drafts without snapshots
 */
export async function deleteBudgetPermanently(id: string): Promise<void> {
  // Check if budget is draft
  const { data: budget, error: budgetError } = await supabase
    .from('planning_budgets')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (budgetError) throw budgetError;
  
  if (!budget) {
    throw new Error('Presupuesto no encontrado');
  }
  
  if (budget.status !== 'draft') {
    throw new Error('Solo se pueden eliminar permanentemente presupuestos en borrador');
  }

  // Perform hard delete
  // Note: Database constraints will prevent deletion if snapshots exist
  const { error } = await supabase
    .from('planning_budgets')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar permanentemente un presupuesto con snapshots publicados');
    }
    throw error;
  }
}

/**
 * Create partida
 */
export async function createPartida(
  partida: Omit<PlanningPartida, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('planning_partidas')
    .insert(partida)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningPartida;
}

/**
 * Update partida
 */
export async function updatePartida(id: string, updates: Partial<PlanningPartida>) {
  const { data, error } = await supabase
    .from('planning_partidas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningPartida;
}

/**
 * Delete partida
 */
export async function deletePartida(id: string) {
  const { error } = await supabase
    .from('planning_partidas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Create concepto with computed fields and inherited defaults
 */
export async function createConcepto(
  concepto: Omit<PlanningConcepto, 'id' | 'created_at' | 'updated_at'>
) {
  // Get budget_id from partida
  const { data: partida } = await supabase
    .from('planning_partidas')
    .select('budget_id')
    .eq('id', concepto.partida_id)
    .single();

  if (!partida) throw new Error('Partida not found');

  // Import defaults service
  const { initializeConceptoDefaults } = await import('./defaultsService');
  
  // If honorarios_pct or desperdicio_pct are 0 (not set), inherit defaults
  let conceptoWithDefaults = { ...concepto };
  
  if (concepto.honorarios_pct === 0 || concepto.desperdicio_pct === 0) {
    const defaults = await initializeConceptoDefaults(partida.budget_id, concepto.partida_id);
    
    if (concepto.honorarios_pct === 0) {
      conceptoWithDefaults.honorarios_pct = defaults.honorarios_pct;
    }
    if (concepto.desperdicio_pct === 0) {
      conceptoWithDefaults.desperdicio_pct = defaults.desperdicio_pct;
    }
  }

  // Compute derived fields
  const computed = computeConceptoFields(conceptoWithDefaults);

  const { data, error } = await supabase
    .from('planning_conceptos')
    .insert(computed)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningConcepto;
}

/**
 * Update concepto with recomputation
 */
export async function updateConcepto(id: string, updates: Partial<PlanningConcepto>) {
  // Fetch current concepto
  const { data: current, error: fetchError } = await supabase
    .from('planning_conceptos')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Merge updates and recompute
  const merged = { ...current, ...updates } as any;
  const computed = computeConceptoFields(merged);

  const { data, error } = await supabase
    .from('planning_conceptos')
    .update(computed as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlanningConcepto;
}

/**
 * Delete concepto
 */
export async function deleteConcepto(id: string) {
  const { error } = await supabase
    .from('planning_conceptos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Compute all fields for a concepto
 */
function computeConceptoFields(concepto: any): any {
  // Default template fields for conceptos
  const fields = [
    { key: 'cantidad_real', role: 'input' as const },
    { key: 'desperdicio_pct', role: 'input' as const },
    { key: 'precio_real', role: 'input' as const },
    { key: 'honorarios_pct', role: 'input' as const },
    { key: 'cantidad', role: 'computed' as const, formula: 'cantidad_real * (1 + desperdicio_pct)' },
    { key: 'pu', role: 'computed' as const, formula: 'precio_real * (1 + honorarios_pct)' },
    { key: 'total_real', role: 'computed' as const, formula: 'precio_real * cantidad_real' },
    { key: 'total', role: 'computed' as const, formula: 'pu * cantidad' },
  ];

  const context: FormulaContext = {
    entity: concepto,
    scope: 'concepto',
    fields: fields.map(f => ({
      id: f.key,
      template_id: 'default',
      key: f.key,
      label: f.key,
      type: 'number',
      role: f.role,
      default_value: 0,
      formula: f.formula || null,
      visible: true,
      helptext: null,
    })),
  };

  const result = computeFields(context);

  if (!result.success) {
    console.error('Errores al computar campos:', result.errors);
  }

  // Convert Decimal values back to numbers
  const computed: any = { ...concepto };
  for (const [key, value] of Object.entries(result.values)) {
    computed[key] = parseFloat(value.toFixed(6));
  }

  return computed;
}

/**
 * Compute aggregations for a partida
 */
export async function computePartidaAggregations(partidaId: string) {
  const { data: conceptos, error } = await supabase
    .from('planning_conceptos')
    .select('*')
    .eq('partida_id', partidaId);

  if (error) throw error;

  const activeConceptos = (conceptos as PlanningConcepto[]).filter(c => c.active);
  const sumableConceptos = activeConceptos.filter(c => c.sumable);

  const subtotal = sumableConceptos.reduce((sum, c) => sum + c.total, 0);
  const totalCantidad = activeConceptos.reduce((sum, c) => sum + c.cantidad, 0);
  const totalCantidadReal = activeConceptos.reduce((sum, c) => sum + c.cantidad_real, 0);

  return {
    subtotal_partida: subtotal,
    total_cantidad: totalCantidad,
    total_cantidad_real: totalCantidadReal,
    count: activeConceptos.length,
  };
}

/**
 * Compute aggregations for entire budget
 */
export async function computeBudgetAggregations(budgetId: string) {
  const { partidas, conceptos } = await getBudgetById(budgetId);

  const activePartidas = partidas.filter(p => p.active);
  const activeConceptos = (conceptos as PlanningConcepto[]).filter(c => c.active);
  const sumableConceptos = activeConceptos.filter(c => c.sumable);

  const grandTotal = sumableConceptos.reduce((sum, c) => sum + c.total, 0);
  const totalCantidad = activeConceptos.reduce((sum, c) => sum + c.cantidad, 0);

  return {
    grand_total: grandTotal,
    total_cantidad: totalCantidad,
    partidas_count: activePartidas.length,
    conceptos_count: activeConceptos.length,
  };
}
