import { supabase } from '@/integrations/supabase/client';

export interface ExecutiveBudgetItem {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  partida_ejecutivo_id: string;
  subpartida_id: string;
  nombre_snapshot: string;
  codigo_snapshot: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  created_at: string;
  updated_at: string;
  subpartida: {
    codigo: string;
    nombre: string;
  } | null;
  partida_ejecutivo: {
    id: string;
    parametrico_id: string;
    parametrico: {
      id: string;
      mayor_id: string;
      partida_id: string;
      mayor: {
        codigo: string;
        nombre: string;
      } | null;
      partida: {
        codigo: string;
        nombre: string;
      } | null;
    } | null;
  } | null;
}

/**
 * Shared service to get executive budget data - used by both Planning and Construction modules
 * This ensures identical data source and structure across modules
 */
export async function getExecutiveBudgetFinal(clientId?: string, projectId?: string): Promise<ExecutiveBudgetItem[]> {
  if (!clientId || !projectId) return [];

  const { data, error } = await supabase
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
  
  if (error) throw error;
  return data || [];
}

/**
 * Transform executive budget data into hierarchical structure for display
 */
export function groupExecutiveBudgetByHierarchy(items: ExecutiveBudgetItem[]) {
  return items.reduce((acc, item) => {
    const mayorNombre = item.partida_ejecutivo?.parametrico?.mayor?.nombre || 'Sin Mayor';
    const partidaNombre = item.partida_ejecutivo?.parametrico?.partida?.nombre || 'Sin Partida';
    
    if (!acc[mayorNombre]) {
      acc[mayorNombre] = {};
    }
    if (!acc[mayorNombre][partidaNombre]) {
      acc[mayorNombre][partidaNombre] = [];
    }
    acc[mayorNombre][partidaNombre].push(item);
    return acc;
  }, {} as Record<string, Record<string, ExecutiveBudgetItem[]>>);
}