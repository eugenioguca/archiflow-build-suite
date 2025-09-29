/**
 * Seed service for generating demo data
 * DEV-ONLY: Used to test performance with large datasets
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BudgetInsert = Database['public']['Tables']['planning_budgets']['Insert'];
type PartidaInsert = Database['public']['Tables']['planning_partidas']['Insert'];
type ConceptoInsert = Database['public']['Tables']['planning_conceptos']['Insert'];

const PARTIDA_NAMES = [
  'Preliminares',
  'Cimentación',
  'Estructura',
  'Albañilería',
  'Instalaciones',
  'Acabados',
  'Carpintería',
  'Herrería',
];

const UNIT_TYPES = ['m2', 'm3', 'pza', 'ml', 'lote', 'kg', 'ton', 'lt'];
const PROVIDERS = ['Proveedor A', 'Proveedor B', 'Proveedor C', 'Proveedor D', null];

/**
 * Generate 10,000 conceptos across 8 partidas for performance testing
 */
export async function seedDemoData(createdBy: string): Promise<{
  budgetId: string;
  partidasCount: number;
  conceptosCount: number;
  timeMs: number;
}> {
  const startTime = performance.now();
  
  // 1. Create demo budget
  const budgetData: BudgetInsert = {
    name: `Demo 10K - ${new Date().toISOString().split('T')[0]}`,
    currency: 'MXN',
    status: 'draft',
    created_by: createdBy,
    settings: { demo: true, generated_at: new Date().toISOString() },
  };

  const { data: budget, error: budgetError } = await supabase
    .from('planning_budgets')
    .insert(budgetData)
    .select()
    .single();

  if (budgetError) throw new Error(`Error creating budget: ${budgetError.message}`);

  // 2. Create 8 partidas
  const partidasData: PartidaInsert[] = PARTIDA_NAMES.map((name, idx) => ({
    budget_id: budget.id,
    name,
    order_index: idx,
    active: true,
    notes: null,
  }));

  const { data: partidas, error: partidasError } = await supabase
    .from('planning_partidas')
    .insert(partidasData)
    .select();

  if (partidasError) throw new Error(`Error creating partidas: ${partidasError.message}`);

  // 3. Generate 10,000 conceptos distributed across partidas
  const TOTAL_CONCEPTOS = 10000;
  const conceptosPerPartida = Math.floor(TOTAL_CONCEPTOS / partidas.length);
  
  const conceptosData: ConceptoInsert[] = [];
  
  for (let partidaIdx = 0; partidaIdx < partidas.length; partidaIdx++) {
    const partida = partidas[partidaIdx];
    const count = partidaIdx === partidas.length - 1 
      ? TOTAL_CONCEPTOS - (conceptosPerPartida * (partidas.length - 1)) // Last partida gets remainder
      : conceptosPerPartida;

    for (let i = 0; i < count; i++) {
      const conceptoNum = partidaIdx * conceptosPerPartida + i + 1;
      conceptosData.push({
        partida_id: partida.id,
        code: `C-${String(conceptoNum).padStart(5, '0')}`,
        short_description: `Concepto ${conceptoNum}`,
        long_description: `Descripción detallada del concepto ${conceptoNum}`,
        unit: UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)],
        provider: PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)],
        active: true,
        sumable: Math.random() > 0.1, // 90% sumable
        order_index: i,
        cantidad_real: Math.random() * 100 + 1,
        desperdicio_pct: Math.random() * 10,
        precio_real: Math.random() * 1000 + 10,
        honorarios_pct: Math.random() * 20,
        props: {},
      });
    }
  }

  // Insert in batches to avoid timeout (Supabase has a limit)
  const BATCH_SIZE = 1000;
  for (let i = 0; i < conceptosData.length; i += BATCH_SIZE) {
    const batch = conceptosData.slice(i, i + BATCH_SIZE);
    const { error: conceptosError } = await supabase
      .from('planning_conceptos')
      .insert(batch);

    if (conceptosError) {
      throw new Error(`Error creating conceptos batch ${i / BATCH_SIZE + 1}: ${conceptosError.message}`);
    }
  }

  const endTime = performance.now();

  return {
    budgetId: budget.id,
    partidasCount: partidas.length,
    conceptosCount: conceptosData.length,
    timeMs: endTime - startTime,
  };
}

/**
 * Delete a demo budget and all its data
 */
export async function deleteDemoData(budgetId: string): Promise<void> {
  // Get all partidas
  const { data: partidas } = await supabase
    .from('planning_partidas')
    .select('id')
    .eq('budget_id', budgetId);

  if (partidas && partidas.length > 0) {
    const partidaIds = partidas.map(p => p.id);
    
    // Delete conceptos (cascading should handle this, but explicit is safer)
    await supabase
      .from('planning_conceptos')
      .delete()
      .in('partida_id', partidaIds);

    // Delete partidas
    await supabase
      .from('planning_partidas')
      .delete()
      .eq('budget_id', budgetId);
  }

  // Delete budget
  await supabase
    .from('planning_budgets')
    .delete()
    .eq('id', budgetId);
}
