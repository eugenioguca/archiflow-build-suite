/**
 * Service for importing TU structure into Planning v2
 */
import { supabase } from '@/integrations/supabase/client';
import type { TUSelection } from '../components/catalog/TUTreeSelector';
import { createPartida, createConcepto } from './budgetService';

export interface TUImportOptions {
  budgetId: string;
  selections: TUSelection[];
  departamento: string;
}

export interface TUImportResult {
  partidasCreated: number;
  conceptosCreated: number;
  mappingsCreated: number;
}

/**
 * Import TU structure into a budget
 * Creates partidas mapped to TU Mayores
 * Creates empty conceptos for each subpartida
 */
export async function importTUStructure(options: TUImportOptions): Promise<TUImportResult> {
  const { budgetId, selections, departamento } = options;
  
  let partidasCreated = 0;
  let conceptosCreated = 0;
  let mappingsCreated = 0;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Get max order_index for partidas in this budget
  const { data: existingPartidas } = await supabase
    .from('planning_partidas')
    .select('order_index')
    .eq('budget_id', budgetId)
    .order('order_index', { ascending: false })
    .limit(1);

  let currentOrderIndex = existingPartidas && existingPartidas.length > 0 
    ? existingPartidas[0].order_index + 1 
    : 0;

  // Process each Mayor selection
  for (const mayorSelection of selections) {
    // Create a Partida for this Mayor
    const partidaName = `${mayorSelection.mayorCodigo} - ${mayorSelection.mayorNombre}`;
    
    const partida = await createPartida({
      budget_id: budgetId,
      name: partidaName,
      order_index: currentOrderIndex++,
      active: true,
      notes: `Importado desde TU: ${departamento} / ${mayorSelection.mayorNombre}`,
    });

    partidasCreated++;

    // Create mapping (cast to any to avoid type errors until types are regenerated)
    const { error: mappingError } = await (supabase as any)
      .from('planning_tu_mapping')
      .insert({
        budget_id: budgetId,
        partida_id: partida.id,
        tu_departamento: departamento,
        tu_mayor_id: mayorSelection.mayorId,
        created_by: user.id,
        notes: `Mayor: ${mayorSelection.mayorNombre}`,
      });

    if (!mappingError) {
      mappingsCreated++;
    }

    // Process partidas within this mayor
    for (const partidaTU of mayorSelection.partidas) {
      // Process subpartidas
      for (const subpartida of partidaTU.subpartidas) {
        // Create an empty concepto for each subpartida
        const conceptoCode = `${partidaTU.partidaCodigo}.${subpartida.subpartidaCodigo}`;
        const conceptoDescription = `${partidaTU.partidaNombre} / ${subpartida.subpartidaNombre}`;

        // Get max order_index for conceptos in this partida
        const { data: existingConceptos } = await supabase
          .from('planning_conceptos')
          .select('order_index')
          .eq('partida_id', partida.id)
          .order('order_index', { ascending: false })
          .limit(1);

        const conceptoOrderIndex = existingConceptos && existingConceptos.length > 0
          ? existingConceptos[0].order_index + 1
          : 0;

        await createConcepto({
          partida_id: partida.id,
          code: conceptoCode,
          short_description: conceptoDescription,
          long_description: `TU: ${departamento} / ${mayorSelection.mayorNombre} / ${partidaTU.partidaNombre} / ${subpartida.subpartidaNombre}`,
          unit: 'PZA',
          provider: null,
          order_index: conceptoOrderIndex,
          active: true,
          sumable: true,
          cantidad_real: 0,
          desperdicio_pct: 0,
          cantidad: 0,
          precio_real: 0,
          honorarios_pct: 0,
          pu: 0,
          total_real: 0,
          total: 0,
          wbs_code: conceptoCode,
          props: {
            tu_import: {
              departamento,
              mayor_id: mayorSelection.mayorId,
              partida_id: partidaTU.partidaId,
              subpartida_id: subpartida.subpartidaId,
            }
          },
        });

        conceptosCreated++;

        // Create mapping for this concepto's partida/subpartida (optional, can be used for tracking)
        await (supabase as any)
          .from('planning_tu_mapping')
          .upsert({
            budget_id: budgetId,
            partida_id: partida.id,
            tu_departamento: departamento,
            tu_mayor_id: mayorSelection.mayorId,
            tu_partida_id: partidaTU.partidaId,
            tu_subpartida_id: subpartida.subpartidaId,
            created_by: user.id,
            notes: `Subpartida: ${subpartida.subpartidaNombre}`,
          }, {
            onConflict: 'budget_id,partida_id',
            ignoreDuplicates: false,
          });
      }
    }
  }

  return {
    partidasCreated,
    conceptosCreated,
    mappingsCreated,
  };
}
