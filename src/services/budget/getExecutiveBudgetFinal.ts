import { supabase } from '@/integrations/supabase/client';

export interface FinalBudgetRow {
  id: string;
  tipo: 'residual' | 'subpartida' | 'parametrico_sin_desagregar';
  departamento: string;
  mayor_codigo: string;
  mayor_nombre: string;
  partida_codigo: string;
  partida_nombre: string;
  subpartida_codigo?: string;
  subpartida_nombre?: string;
  unidad?: string;
  cantidad?: number;
  precio_unitario?: number;
  importe: number;
  estado?: 'dentro' | 'excedido';
  parametrico_partida_id?: string;
  mayor_id?: string;
  partida_id?: string;
  created_at?: string;
}

export interface FinalBudgetTotals {
  totalParametrico: number;
  totalEjecutivo: number;
  totalResidual: number;
  diferencia: number;
  partidasCount: number;
  subpartidasCount: number;
  residualesExcedidos: number;
}

export interface FinalBudgetGrouped {
  [mayorId: string]: {
    mayor_codigo: string;
    mayor_nombre: string;
    rows: FinalBudgetRow[];
    subtotal_parametrico: number;
    subtotal_ejecutivo: number;
    subtotal_residual: number;
  };
}

/**
 * Shared service for executive final budget - identical to Planning's Vista Final
 * This replicates the exact same logic as useExecutiveFinalBudget
 */
export async function getExecutiveBudgetFinal(clientId?: string, projectId?: string) {
  if (!clientId || !projectId) {
    return {
      finalRows: [],
      totals: {
        totalParametrico: 0,
        totalEjecutivo: 0,
        totalResidual: 0,
        diferencia: 0,
        partidasCount: 0,
        subpartidasCount: 0,
        residualesExcedidos: 0
      } as FinalBudgetTotals,
      groupedByMayor: {} as FinalBudgetGrouped
    };
  }

  // Load parametric data
  const { data: presupuestos, error: parametricError } = await supabase
    .from('presupuesto_parametrico')
    .select(`
      *,
      mayor:chart_of_accounts_mayor(codigo, nombre),
      partida:chart_of_accounts_partidas(codigo, nombre)
    `)
    .eq('cliente_id', clientId)
    .eq('proyecto_id', projectId)
    .order('created_at', { ascending: true });

  if (parametricError) throw parametricError;

  // Load executive data
  const { data: executiveItems, error: executiveError } = await supabase
    .from('presupuesto_ejecutivo_subpartida')
    .select(`
      *,
      subpartida:chart_of_accounts_subpartidas(codigo, nombre),
      partida_ejecutivo:presupuesto_ejecutivo_partida(
        id,
        parametrico_id,
        parametrico:presupuesto_parametrico(
          id,
          mayor_id,
          partida_id,
          mayor:chart_of_accounts_mayor(codigo, nombre),
          partida:chart_of_accounts_partidas(codigo, nombre)
        )
      )
    `)
    .eq('cliente_id', clientId)
    .eq('proyecto_id', projectId)
    .order('created_at', { ascending: true });

  if (executiveError) throw executiveError;

  if (!presupuestos?.length) {
    return {
      finalRows: [],
      totals: {
        totalParametrico: 0,
        totalEjecutivo: 0,
        totalResidual: 0,
        diferencia: 0,
        partidasCount: 0,
        subpartidasCount: 0,
        residualesExcedidos: 0
      } as FinalBudgetTotals,
      groupedByMayor: {} as FinalBudgetGrouped
    };
  }

  const rows: FinalBudgetRow[] = [];
  const grouped: FinalBudgetGrouped = {};
  
  // Create a map of executive items by parametrico_id
  const executiveByParametricoId = new Map();
  
  (executiveItems || []).forEach(item => {
    const parametricoId = item.partida_ejecutivo?.parametrico?.id;
    if (!parametricoId) return;
    
    if (!executiveByParametricoId.has(parametricoId)) {
      executiveByParametricoId.set(parametricoId, []);
    }
    executiveByParametricoId.get(parametricoId).push(item);
  });

  // Process each parametric item
  let residualesExcedidos = 0;

  presupuestos.forEach(parametrico => {
    const executiveSubpartidas = executiveByParametricoId.get(parametrico.id) || [];
    const totalEjecutivo = executiveSubpartidas.reduce((sum: number, item: any) => sum + item.importe, 0);
    const residual = parametrico.monto_total - totalEjecutivo;
    const estado = residual >= 0 ? 'dentro' : 'excedido';

    if (estado === 'excedido') residualesExcedidos++;

    const mayorId = parametrico.mayor_id || 'sin_mayor';

    // Initialize mayor group
    if (!grouped[mayorId]) {
      grouped[mayorId] = {
        mayor_codigo: parametrico.mayor?.codigo || '',
        mayor_nombre: parametrico.mayor?.nombre || 'Sin Mayor',
        rows: [],
        subtotal_parametrico: 0,
        subtotal_ejecutivo: 0,
        subtotal_residual: 0
      };
    }

    // Add residual row (always)
    const residualRow: FinalBudgetRow = {
      id: `residual-${parametrico.id}`,
      tipo: 'residual',
      departamento: parametrico.departamento,
      mayor_codigo: parametrico.mayor?.codigo || '',
      mayor_nombre: parametrico.mayor?.nombre || '',
      partida_codigo: parametrico.partida?.codigo || '',
      partida_nombre: parametrico.partida?.nombre || '',
      importe: residual,
      estado,
      parametrico_partida_id: parametrico.id,
      mayor_id: parametrico.mayor_id,
      partida_id: parametrico.partida_id
    };

    rows.push(residualRow);
    grouped[mayorId].rows.push(residualRow);
    grouped[mayorId].subtotal_parametrico += parametrico.monto_total;
    grouped[mayorId].subtotal_ejecutivo += totalEjecutivo;
    grouped[mayorId].subtotal_residual += residual;

    // Add subpartida rows
    executiveSubpartidas
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((subpartida: any) => {
        const subpartidaRow: FinalBudgetRow = {
          id: `subpartida-${subpartida.id}`,
          tipo: 'subpartida',
          departamento: parametrico.departamento,
          mayor_codigo: parametrico.mayor?.codigo || '',
          mayor_nombre: parametrico.mayor?.nombre || '',
          partida_codigo: parametrico.partida?.codigo || '',
          partida_nombre: parametrico.partida?.nombre || '',
          subpartida_codigo: subpartida.codigo_snapshot || subpartida.subpartida?.codigo || '',
          subpartida_nombre: subpartida.nombre_snapshot || subpartida.subpartida?.nombre || '',
          unidad: subpartida.unidad,
          cantidad: subpartida.cantidad,
          precio_unitario: subpartida.precio_unitario,
          importe: subpartida.importe,
          parametrico_partida_id: parametrico.id,
          mayor_id: parametrico.mayor_id,
          partida_id: parametrico.partida_id,
          created_at: subpartida.created_at
        };

        rows.push(subpartidaRow);
        grouped[mayorId].rows.push(subpartidaRow);
      });
  });

  // Calculate totals
  const totalParametrico = presupuestos.reduce((sum, item) => sum + item.monto_total, 0);
  const totalEjecutivo = (executiveItems || []).reduce((sum, item) => sum + item.importe, 0);
  const totalResidual = rows
    .filter(row => row.tipo === 'residual')
    .reduce((sum, row) => sum + row.importe, 0);

  const totals: FinalBudgetTotals = {
    totalParametrico,
    totalEjecutivo,
    totalResidual,
    diferencia: totalParametrico - totalEjecutivo,
    partidasCount: presupuestos.length,
    subpartidasCount: executiveItems?.length || 0,
    residualesExcedidos
  };

  return { finalRows: rows, totals, groupedByMayor: grouped };
}