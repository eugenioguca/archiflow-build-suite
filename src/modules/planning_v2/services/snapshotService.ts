/**
 * Snapshot service for Planning v2
 * Handles immutable budget versions
 */
import { supabase } from '@/integrations/supabase/client';
import { getBudgetById } from './budgetService';
import { priceIntelligenceService } from './priceIntelligenceService';
import Decimal from 'decimal.js';

export interface BudgetSnapshot {
  id: string;
  budget_id: string;
  version_number: number;
  snapshot_date: string;
  snapshot_data: any;
  totals: BudgetTotals;
  settings: Record<string, any>;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface BudgetTotals {
  subtotal: number;
  iva_rate: number;
  iva_amount: number;
  retenciones: number;
  grand_total: number;
  partidas: Array<{
    partida_id: string;
    partida_name: string;
    subtotal: number;
    conceptos_count: number;
  }>;
}

/**
 * Calculate budget totals with taxes
 */
export async function calculateBudgetTotals(
  budgetId: string,
  ivaRate: number = 0.16,
  retencionesRate: number = 0
): Promise<BudgetTotals> {
  const { budget, partidas, conceptos } = await getBudgetById(budgetId);

  const partidasTotals = partidas
    .filter(p => p.active)
    .map(partida => {
      const partidaConceptos = conceptos.filter(
        c => c.partida_id === partida.id && c.active && c.sumable
      );
      
      const subtotal = partidaConceptos.reduce(
        (sum, c) => sum + c.total,
        0
      );

      return {
        partida_id: partida.id,
        partida_name: partida.name,
        subtotal,
        conceptos_count: partidaConceptos.length,
      };
    });

  const subtotal = partidasTotals.reduce((sum, p) => sum + p.subtotal, 0);
  const ivaAmount = new Decimal(subtotal).times(ivaRate).toNumber();
  const retenciones = new Decimal(subtotal).times(retencionesRate).toNumber();
  const grandTotal = subtotal + ivaAmount - retenciones;

  return {
    subtotal,
    iva_rate: ivaRate,
    iva_amount: ivaAmount,
    retenciones,
    grand_total: grandTotal,
    partidas: partidasTotals,
  };
}

/**
 * Create a snapshot of current budget state
 * También crea observaciones de precios para cada concepto sumable
 */
export async function createSnapshot(
  budgetId: string,
  notes?: string,
  taxSettings?: { ivaRate?: number; retencionesRate?: number }
): Promise<BudgetSnapshot> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Usuario no autenticado');

  // Get complete budget data
  const budgetData = await getBudgetById(budgetId);

  // Calculate totals
  const totals = await calculateBudgetTotals(
    budgetId,
    taxSettings?.ivaRate,
    taxSettings?.retencionesRate
  );

  // Get next version number
  const { data: existingSnapshots } = await supabase
    .from('planning_budget_snapshots')
    .select('version_number')
    .eq('budget_id', budgetId)
    .order('version_number', { ascending: false })
    .limit(1);

  const versionNumber = existingSnapshots?.[0]?.version_number 
    ? existingSnapshots[0].version_number + 1 
    : 1;

  // Create snapshot
  const { data, error } = await supabase
    .from('planning_budget_snapshots')
    .insert({
      budget_id: budgetId,
      version_number: versionNumber,
      snapshot_data: budgetData as any,
      totals: totals as any,
      settings: taxSettings || {},
      notes,
      created_by: user.user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Crear observaciones de precios para conceptos sumables
  const observationDate = new Date().toISOString().split('T')[0];
  
  for (const concepto of budgetData.conceptos) {
    if (concepto.sumable && concepto.wbs_code && concepto.active) {
      await priceIntelligenceService.createObservationFromBudget(
        budgetId,
        budgetData.budget.project_id,
        concepto.wbs_code,
        concepto.unit,
        concepto.pu,
        concepto.provider,
        'MXN',
        observationDate
      );
    }
  }

  return data as unknown as BudgetSnapshot;
}

/**
 * Get all snapshots for a budget
 */
export async function getSnapshots(budgetId: string): Promise<BudgetSnapshot[]> {
  const { data, error } = await supabase
    .from('planning_budget_snapshots')
    .select('*')
    .eq('budget_id', budgetId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as BudgetSnapshot[];
}

/**
 * Get specific snapshot
 */
export async function getSnapshot(snapshotId: string): Promise<BudgetSnapshot | null> {
  const { data, error } = await supabase
    .from('planning_budget_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (error) {
    console.error('Error fetching snapshot:', error);
    return null;
  }

  return data as unknown as BudgetSnapshot;
}

/**
 * Compare two snapshots
 */
export interface SnapshotComparison {
  version_from: number;
  version_to: number;
  delta_grand_total: number;
  delta_percentage: number;
  partidas_changes: Array<{
    partida_name: string;
    status: 'added' | 'removed' | 'modified' | 'unchanged';
    subtotal_from: number | null;
    subtotal_to: number | null;
    delta: number;
  }>;
}

export async function compareSnapshots(
  snapshotId1: string,
  snapshotId2: string
): Promise<SnapshotComparison> {
  const snapshot1 = await getSnapshot(snapshotId1);
  const snapshot2 = await getSnapshot(snapshotId2);

  if (!snapshot1 || !snapshot2) {
    throw new Error('Snapshots no encontrados');
  }

  // Order by version (older first)
  const [older, newer] = snapshot1.version_number < snapshot2.version_number
    ? [snapshot1, snapshot2]
    : [snapshot2, snapshot1];

  const partidasFrom = new Map(
    older.totals.partidas.map(p => [p.partida_id, p])
  );
  const partidasTo = new Map(
    newer.totals.partidas.map(p => [p.partida_id, p])
  );

  const allPartidaIds = new Set([
    ...partidasFrom.keys(),
    ...partidasTo.keys(),
  ]);

  const partidasChanges = Array.from(allPartidaIds).map(partidaId => {
    const from = partidasFrom.get(partidaId);
    const to = partidasTo.get(partidaId);

    let status: 'added' | 'removed' | 'modified' | 'unchanged';
    let delta = 0;

    if (!from && to) {
      status = 'added';
      delta = to.subtotal;
    } else if (from && !to) {
      status = 'removed';
      delta = -from.subtotal;
    } else if (from && to) {
      delta = to.subtotal - from.subtotal;
      status = delta === 0 ? 'unchanged' : 'modified';
    } else {
      status = 'unchanged';
    }

    return {
      partida_name: to?.partida_name || from?.partida_name || 'Desconocida',
      status,
      subtotal_from: from?.subtotal || null,
      subtotal_to: to?.subtotal || null,
      delta,
    };
  });

  const deltaGrandTotal = newer.totals.grand_total - older.totals.grand_total;
  const deltaPercentage = older.totals.grand_total > 0
    ? (deltaGrandTotal / older.totals.grand_total) * 100
    : 0;

  return {
    version_from: older.version_number,
    version_to: newer.version_number,
    delta_grand_total: deltaGrandTotal,
    delta_percentage: deltaPercentage,
    partidas_changes: partidasChanges.sort((a, b) => 
      Math.abs(b.delta) - Math.abs(a.delta)
    ),
  };
}

/**
 * Publish budget (create snapshot and change status)
 */
export async function publishBudget(
  budgetId: string,
  taxSettings?: { ivaRate?: number; retencionesRate?: number }
): Promise<BudgetSnapshot> {
  // Create snapshot
  const snapshot = await createSnapshot(
    budgetId,
    'Versión publicada',
    taxSettings
  );

  // Update budget status
  await supabase
    .from('planning_budgets')
    .update({ status: 'published' })
    .eq('id', budgetId);

  return snapshot;
}
