/**
 * Service for managing defaults inheritance and propagation
 */
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schema for defaults
const defaultsSchema = z.object({
  honorarios_pct: z.number().min(0).max(1),
  desperdicio_pct: z.number().min(0).max(1),
});

export interface BudgetDefaults {
  honorarios_pct_default: number;
  desperdicio_pct_default: number;
  enable_iva: boolean;
  iva_rate: number;
  currency: string;
}

export interface PartidaDefaults {
  honorarios_pct_override: number | null;
  desperdicio_pct_override: number | null;
}

export interface ApplyDefaultsOptions {
  budgetId: string;
  applyHonorarios: boolean;
  applyDesperdicio: boolean;
}

/**
 * Get effective defaults for a concepto
 * Priority: Partida override > Budget defaults
 */
export async function getEffectiveDefaults(
  budgetId: string,
  partidaId: string
): Promise<{
  honorarios_pct: number;
  desperdicio_pct: number;
}> {
  // Get budget defaults
  const { data: budget, error: budgetError } = await supabase
    .from('planning_budgets')
    .select('settings')
    .eq('id', budgetId)
    .single();

  if (budgetError) throw budgetError;

  const budgetDefaults = (budget.settings || {}) as any;
  
  // Get partida overrides
  const { data: partida, error: partidaError } = await supabase
    .from('planning_partidas')
    .select('honorarios_pct_override, desperdicio_pct_override')
    .eq('id', partidaId)
    .single();

  if (partidaError) throw partidaError;

  // Use partida override if present, otherwise budget default
  return {
    honorarios_pct: partida.honorarios_pct_override ?? budgetDefaults.honorarios_pct_default ?? 0.17,
    desperdicio_pct: partida.desperdicio_pct_override ?? budgetDefaults.desperdicio_pct_default ?? 0.05,
  };
}

/**
 * Apply defaults to all conceptos where the field is NULL
 * Does not override existing non-null values
 */
export async function applyDefaults(options: ApplyDefaultsOptions): Promise<{
  updated: number;
  errors: string[];
}> {
  const { budgetId, applyHonorarios, applyDesperdicio } = options;

  // Validate options
  if (!applyHonorarios && !applyDesperdicio) {
    return { updated: 0, errors: ['Debes seleccionar al menos un campo para aplicar'] };
  }

  let updated = 0;
  const errors: string[] = [];

  try {
    // Get budget defaults
    const { data: budget, error: budgetError } = await supabase
      .from('planning_budgets')
      .select('settings')
      .eq('id', budgetId)
      .single();

    if (budgetError) throw budgetError;

    const budgetSettings = (budget.settings || {}) as any;
    const budgetDefaults: BudgetDefaults = {
      honorarios_pct_default: budgetSettings.honorarios_pct_default ?? 0.17,
      desperdicio_pct_default: budgetSettings.desperdicio_pct_default ?? 0.05,
      enable_iva: budgetSettings.enable_iva ?? true,
      iva_rate: budgetSettings.iva_rate ?? 0.16,
      currency: budgetSettings.currency ?? 'MXN',
    };

    // Get all partidas with their overrides
    const { data: partidas, error: partidasError } = await supabase
      .from('planning_partidas')
      .select('id, honorarios_pct_override, desperdicio_pct_override')
      .eq('budget_id', budgetId);

    if (partidasError) throw partidasError;

    // For each partida, get conceptos and apply defaults
    for (const partida of partidas || []) {
      const effectiveHonorarios = partida.honorarios_pct_override ?? budgetDefaults.honorarios_pct_default;
      const effectiveDesperdicio = partida.desperdicio_pct_override ?? budgetDefaults.desperdicio_pct_default;

      // Build update object
      const updates: any = {};
      if (applyHonorarios) {
        updates.honorarios_pct = effectiveHonorarios;
      }
      if (applyDesperdicio) {
        updates.desperdicio_pct = effectiveDesperdicio;
      }

      // Apply to conceptos where fields are NULL (0 in this case, since they default to 0)
      // We consider 0 as "not set" for percentages
      let query = supabase
        .from('planning_conceptos')
        .update(updates)
        .eq('partida_id', partida.id)
        .eq('active', true);

      // Only update where the field is 0 (null equivalent)
      if (applyHonorarios && applyDesperdicio) {
        query = query.or('honorarios_pct.eq.0,desperdicio_pct.eq.0');
      } else if (applyHonorarios) {
        query = query.eq('honorarios_pct', 0);
      } else if (applyDesperdicio) {
        query = query.eq('desperdicio_pct', 0);
      }

      const { error: updateError } = await query;

      if (updateError) {
        errors.push(`Error en partida ${partida.id}: ${updateError.message}`);
      } else {
        // Count updated rows
        const { count: countResult } = await supabase
          .from('planning_conceptos')
          .select('*', { count: 'exact', head: true })
          .eq('partida_id', partida.id)
          .eq('active', true);
        
        updated += countResult || 0;
      }
    }

    return { updated, errors };
  } catch (error: any) {
    return { updated, errors: [error.message] };
  }
}

/**
 * Initialize defaults for a new concepto
 * Called during concepto creation
 */
export async function initializeConceptoDefaults(
  budgetId: string,
  partidaId: string
): Promise<{
  honorarios_pct: number;
  desperdicio_pct: number;
}> {
  return getEffectiveDefaults(budgetId, partidaId);
}
