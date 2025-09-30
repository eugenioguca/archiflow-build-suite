/**
 * Read-only adapter for TU actuals (Budget vs Actual)
 * Maps TU transactions to Planning v2 WBS codes
 */
import { supabase } from '@/integrations/supabase/client';
import { PLANNING_V2_TU_READONLY } from '../config/featureFlag';

export interface TUActual {
  id: string;
  wbs_code: string;
  monto_total: number;
  cantidad_requerida: number | null;
  moneda: string;
  fecha_requerida: string | null;
  proveedor_sugerido: string | null;
  descripcion_concepto: string | null;
  descripcion_larga: string | null;
  tiene_factura: boolean;
  transaction_link: string;
  // TU dimensions
  departamento: string | null;
  mayor: string | null;
  partida: string | null;
  subpartida: string | null;
}

export interface TUActualsSummary {
  wbs_code: string;
  total_amount: number;
  transaction_count: number;
  transactions: TUActual[];
}

export const tuActualsAdapter = {
  /**
   * Check if TU integration is enabled
   */
  isEnabled(): boolean {
    return PLANNING_V2_TU_READONLY;
  },

  /**
   * Fetch actuals from TU for a specific WBS code with timeout
   */
  async getActualsByWBS(
    wbsCode: string,
    projectId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<TUActual[]> {
    if (!this.isEnabled()) {
      console.warn('TU integration is disabled');
      return [];
    }

    try {
      // Create timeout promise (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TU_TIMEOUT')), 5000);
      });

      // Race between actual fetch and timeout
      const result = await Promise.race([
        this.fetchActualsInternal(wbsCode, projectId, fromDate, toDate),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'TU_TIMEOUT') {
        console.warn('TU fetch timeout for WBS:', wbsCode);
      } else {
        console.error('Error in getActualsByWBS:', error);
      }
      // Return empty array to allow Planning v2 to continue working
      return [];
    }
  },

  /**
   * Internal fetch without timeout wrapper
   */
  async fetchActualsInternal(
    wbsCode: string,
    projectId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<TUActual[]> {
    // First, get the WBS dimensions
    const { data: wbsData, error: wbsError } = await supabase
      .from('planning_wbs_codes')
      .select('departamento, mayor, partida, subpartida')
      .eq('code', wbsCode)
      .single();

    if (wbsError) {
      console.error('Error fetching WBS code:', wbsError);
      return [];
    }

    if (!wbsData) {
      console.warn('WBS code not found:', wbsCode);
      return [];
    }

    // Build query for TU transactions
    let query = supabase
      .from('unified_financial_transactions')
      .select(`
        id,
        monto_total,
        cantidad_requerida,
        moneda,
        fecha_requerida,
        proveedor_sugerido,
        descripcion_concepto,
        descripcion_larga,
        tiene_factura,
        chart_of_accounts_departamentos!inner(departamento),
        chart_of_accounts_mayor!inner(codigo, nombre),
        chart_of_accounts_partidas!inner(codigo, nombre),
        chart_of_accounts_subpartidas(codigo, nombre)
      `);

    // Filter by project if provided
    if (projectId) {
      query = query.eq('empresa_proyecto_id', projectId);
    }

    // Filter by date range if provided
    if (fromDate) {
      query = query.gte('fecha_requerida', fromDate);
    }
    if (toDate) {
      query = query.lte('fecha_requerida', toDate);
    }

    // Filter by WBS dimensions
    if (wbsData.departamento) {
      query = query.eq('chart_of_accounts_departamentos.departamento', wbsData.departamento);
    }
    if (wbsData.mayor) {
      query = query.eq('chart_of_accounts_mayor.codigo', wbsData.mayor);
    }
    if (wbsData.partida) {
      query = query.eq('chart_of_accounts_partidas.codigo', wbsData.partida);
    }
    if (wbsData.subpartida) {
      query = query.eq('chart_of_accounts_subpartidas.codigo', wbsData.subpartida);
    }

    const { data, error } = await query.order('fecha_requerida', { ascending: false });

    if (error) {
      console.error('Error fetching TU actuals:', error);
      return [];
    }

    // Map to TUActual format
    return (data || []).map((item: any) => ({
      id: item.id,
      wbs_code: wbsCode,
      monto_total: item.monto_total || 0,
      cantidad_requerida: item.cantidad_requerida,
      moneda: item.moneda || 'MXN',
      fecha_requerida: item.fecha_requerida,
      proveedor_sugerido: item.proveedor_sugerido,
      descripcion_concepto: item.descripcion_concepto,
      descripcion_larga: item.descripcion_larga,
      tiene_factura: item.tiene_factura || false,
      transaction_link: `/unified-transactions?id=${item.id}`,
      departamento: item.chart_of_accounts_departamentos?.departamento || null,
      mayor: item.chart_of_accounts_mayor?.nombre || null,
      partida: item.chart_of_accounts_partidas?.nombre || null,
      subpartida: item.chart_of_accounts_subpartidas?.nombre || null,
    }));
  },

  /**
   * Get actuals summary for multiple WBS codes
   */
  async getActualsSummary(
    wbsCodes: string[],
    projectId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<Map<string, TUActualsSummary>> {
    if (!this.isEnabled()) {
      return new Map();
    }

    const summaryMap = new Map<string, TUActualsSummary>();

    try {
      // Fetch actuals for each WBS code
      const results = await Promise.all(
        wbsCodes.map(async (wbsCode) => {
          const transactions = await this.getActualsByWBS(
            wbsCode,
            projectId,
            fromDate,
            toDate
          );

          const total = transactions.reduce(
            (sum, t) => sum + (t.monto_total || 0),
            0
          );

          return {
            wbsCode,
            summary: {
              wbs_code: wbsCode,
              total_amount: total,
              transaction_count: transactions.length,
              transactions,
            },
          };
        })
      );

      // Build map
      results.forEach(({ wbsCode, summary }) => {
        summaryMap.set(wbsCode, summary);
      });

      return summaryMap;
    } catch (error) {
      console.error('Error in getActualsSummary:', error);
      return new Map();
    }
  },

  /**
   * Get actuals for a specific partida (aggregated)
   */
  async getActualsForPartida(
    partidaId: string,
    projectId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<TUActualsSummary | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      // Get all conceptos for this partida
      const { data: conceptos, error: conceptosError } = await supabase
        .from('planning_conceptos')
        .select('id, wbs_code')
        .eq('partida_id', partidaId);

      if (conceptosError) {
        console.error('Error fetching conceptos:', conceptosError);
        return null;
      }

      const conceptoIds = conceptos?.map((c) => c.id) || [];
      const wbsCodes = conceptos?.map((c) => c.wbs_code).filter(Boolean) || [];

      // PART 1: Get linked transactions via planning_concepto_tu_links
      let linkedTotal = 0;
      const linkedTransactions: TUActual[] = [];

      if (conceptoIds.length > 0) {
        const { data: links, error: linksError } = await supabase
          .from('planning_concepto_tu_links' as any)
          .select(`
            total,
            quantity,
            unified_financial_transactions (
              id,
              monto_total,
              cantidad_requerida,
              moneda,
              fecha_requerida,
              proveedor_sugerido,
              descripcion,
              wbs_subpartida,
              departamento
            )
          `)
          .in('concepto_id', conceptoIds);

        if (!linksError && links) {
          links.forEach((link: any) => {
            const tx = link.unified_financial_transactions;
            if (tx) {
              linkedTotal += link.total || tx.monto_total || 0;
              linkedTransactions.push({
                id: tx.id,
                wbs_code: tx.wbs_subpartida || 'Vinculado',
                monto_total: tx.monto_total,
                cantidad_requerida: tx.cantidad_requerida,
                moneda: tx.moneda || 'MXN',
                fecha_requerida: tx.fecha_requerida,
                proveedor_sugerido: tx.proveedor_sugerido,
                descripcion_concepto: tx.descripcion,
                descripcion_larga: null,
                tiene_factura: false,
                transaction_link: `/unified-transactions?tx=${tx.id}`,
                departamento: tx.departamento,
                mayor: null,
                partida: null,
                subpartida: tx.wbs_subpartida,
              });
            }
          });
        }
      }

      // PART 2: Get WBS-matched transactions (original logic)
      let wbsTotal = 0;
      const wbsTransactions: TUActual[] = [];

      if (wbsCodes.length > 0) {
        const summaries = await this.getActualsSummary(
          wbsCodes,
          projectId,
          fromDate,
          toDate
        );

        summaries.forEach((summary) => {
          wbsTransactions.push(...summary.transactions);
          wbsTotal += summary.total_amount;
        });
      }

      // Combine both sources (deduplicate by id)
      const allTransactionsMap = new Map<string, TUActual>();
      [...linkedTransactions, ...wbsTransactions].forEach((tx) => {
        if (!allTransactionsMap.has(tx.id)) {
          allTransactionsMap.set(tx.id, tx);
        }
      });

      const allTransactions = Array.from(allTransactionsMap.values());
      const totalAmount = allTransactions.reduce(
        (sum, tx) => sum + (tx.monto_total || 0),
        0
      );

      return {
        wbs_code: 'Partida',
        total_amount: totalAmount,
        transaction_count: allTransactions.length,
        transactions: allTransactions,
      };
    } catch (error) {
      console.error('Error in getActualsForPartida:', error);
      return null;
    }
  },
};
