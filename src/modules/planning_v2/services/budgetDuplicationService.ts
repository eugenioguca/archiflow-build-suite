/**
 * Service for duplicating budgets with all related data
 */
import { supabase } from '@/integrations/supabase/client';

export interface DuplicateBudgetOptions {
  newName: string;
  preserveQuantities: boolean;
  preservePrices: boolean;
}

/**
 * Duplicates a budget with all its partidas, conceptos, and TU mappings
 */
export async function duplicateBudget(
  sourceBudgetId: string,
  options: DuplicateBudgetOptions
): Promise<string> {
  const { newName, preserveQuantities, preservePrices } = options;

  try {
    // 1. Get source budget
    const { data: sourceBudget, error: budgetError } = await supabase
      .from('planning_budgets')
      .select('*')
      .eq('id', sourceBudgetId)
      .single();

    if (budgetError) throw budgetError;
    if (!sourceBudget) throw new Error('Budget not found');

    // 2. Get user for created_by
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuario no autenticado');

    // 3. Create new budget
    const { data: newBudget, error: newBudgetError } = await supabase
      .from('planning_budgets')
      .insert({
        name: newName,
        project_id: sourceBudget.project_id,
        client_id: sourceBudget.client_id,
        status: 'draft',
        settings: sourceBudget.settings,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (newBudgetError) throw newBudgetError;
    if (!newBudget) throw new Error('Failed to create new budget');

    // 3. Get all partidas from source budget
    const { data: sourcePartidas, error: partidasError } = await supabase
      .from('planning_partidas')
      .select('*')
      .eq('budget_id', sourceBudgetId)
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (partidasError) throw partidasError;

    // 4. Clone partidas and create mapping
    const partidaIdMap = new Map<string, string>(); // old ID -> new ID

    for (const sourcePartida of sourcePartidas || []) {
      const { data: newPartida, error: newPartidaError } = await supabase
        .from('planning_partidas')
        .insert({
          budget_id: newBudget.id,
          name: sourcePartida.name,
          order_index: sourcePartida.order_index,
          active: sourcePartida.active,
          notes: sourcePartida.notes,
          honorarios_pct_override: sourcePartida.honorarios_pct_override,
          desperdicio_pct_override: sourcePartida.desperdicio_pct_override,
        })
        .select()
        .single();

      if (newPartidaError) throw newPartidaError;
      if (newPartida) {
        partidaIdMap.set(sourcePartida.id, newPartida.id);

        // Clone TU mapping for this partida
        const { data: tuMapping } = await supabase
          .from('planning_tu_mapping')
          .select('tu_mayor_id, tu_partida_id')
          .eq('partida_id', sourcePartida.id)
          .maybeSingle();

        if (tuMapping) {
          await supabase
            .from('planning_tu_mapping')
            .insert({
              budget_id: newBudget.id,
              partida_id: newPartida.id,
              tu_mayor_id: tuMapping.tu_mayor_id,
              tu_partida_id: tuMapping.tu_partida_id,
              created_by: userData.user.id,
            });
        }
      }
    }

    // 5. Get all conceptos from source partidas
    const sourcePartidaIds = (sourcePartidas || []).map(p => p.id);
    
    if (sourcePartidaIds.length === 0) {
      return newBudget.id; // No partidas, no conceptos to clone
    }

    const { data: sourceConceptos, error: conceptosError } = await supabase
      .from('planning_conceptos')
      .select('*')
      .in('partida_id', sourcePartidaIds)
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (conceptosError) throw conceptosError;

    // 6. Clone conceptos
    for (const sourceConcepto of sourceConceptos || []) {
      const newPartidaId = partidaIdMap.get(sourceConcepto.partida_id);
      if (!newPartidaId) continue; // Skip if partida wasn't cloned

      const conceptoData: any = {
        partida_id: newPartidaId,
        code: sourceConcepto.code,
        short_description: sourceConcepto.short_description,
        long_description: sourceConcepto.long_description,
        unit: sourceConcepto.unit,
        provider: sourceConcepto.provider,
        order_index: sourceConcepto.order_index,
        active: sourceConcepto.active,
        sumable: sourceConcepto.sumable,
        wbs_code: null, // WBS no longer used
        props: sourceConcepto.props,
      };

      // Handle quantities
      if (preserveQuantities) {
        conceptoData.cantidad_real = sourceConcepto.cantidad_real;
        conceptoData.desperdicio_pct = sourceConcepto.desperdicio_pct;
        conceptoData.cantidad = sourceConcepto.cantidad;
      } else {
        conceptoData.cantidad_real = 0;
        conceptoData.desperdicio_pct = 0;
        conceptoData.cantidad = 0;
      }

      // Handle prices
      if (preservePrices) {
        conceptoData.precio_real = sourceConcepto.precio_real;
        conceptoData.honorarios_pct = sourceConcepto.honorarios_pct;
        conceptoData.pu = sourceConcepto.pu;
      } else {
        conceptoData.precio_real = 0;
        conceptoData.honorarios_pct = 0;
        conceptoData.pu = 0;
      }

      // Recalculate totals
      const cantidad = conceptoData.cantidad || 0;
      const pu = conceptoData.pu || 0;
      conceptoData.total_real = conceptoData.cantidad_real * conceptoData.precio_real;
      conceptoData.total = cantidad * pu;

      const { data: newConcepto, error: newConceptoError } = await supabase
        .from('planning_conceptos')
        .insert(conceptoData)
        .select()
        .single();

      if (newConceptoError) throw newConceptoError;
    }

    return newBudget.id;
  } catch (error) {
    console.error('Error duplicating budget:', error);
    throw error;
  }
}
