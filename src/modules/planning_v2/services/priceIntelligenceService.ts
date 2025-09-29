/**
 * Servicio de inteligencia de precios para Planning v2
 * Maneja observaciones de precios y estadísticas
 */
import { supabase } from '@/integrations/supabase/client';
import { Decimal } from 'decimal.js';

export interface PriceObservation {
  id: string;
  wbs_code: string;
  unit: string;
  pu: number;
  currency: string;
  observation_date: string;
  provider: string | null;
  project_id: string | null;
  budget_id: string | null;
  source: 'budget' | 'tu';
  exchange_rate: number;
  pu_mxn: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PriceStatistics {
  median_price: number;
  p25_price: number;
  p75_price: number;
  last_seen_price: number;
  last_seen_date: string;
  sample_size: number;
  recommended_pu: number;
}

export interface PriceAlert {
  severity: 'info' | 'warning' | 'error';
  message: string;
  deviation_percentage: number;
  requires_justification: boolean;
}

const DEVIATION_WARNING_THRESHOLD = 15; // 15% desviación genera advertencia
const DEVIATION_ERROR_THRESHOLD = 30; // 30% requiere justificación obligatoria

export const priceIntelligenceService = {
  /**
   * Crear observación de precio desde presupuesto
   */
  async createObservationFromBudget(
    budgetId: string,
    projectId: string | null,
    wbsCode: string,
    unit: string,
    pu: number,
    provider: string | null,
    currency: string = 'MXN',
    observationDate: string
  ): Promise<void> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuario no autenticado');

      // Usar upsert para evitar duplicados (ON CONFLICT DO NOTHING)
      const { error } = await supabase
        .from('planning_price_observations' as any)
        .upsert(
          {
            wbs_code: wbsCode,
            unit,
            pu,
            currency,
            observation_date: observationDate,
            provider,
            project_id: projectId,
            budget_id: budgetId,
            source: 'budget',
            exchange_rate: 1.0,
            pu_mxn: pu * 1.0, // Por ahora, asumimos MXN
            created_by: userData.user.id,
          },
          {
            onConflict: 'budget_id,wbs_code,unit,version_number',
            ignoreDuplicates: true,
          }
        );

      if (error) {
        console.error('Error creando observación de precio:', error);
        // No lanzamos el error para que el proceso de publicación continúe
      }
    } catch (error) {
      console.error('Error en createObservationFromBudget:', error);
      // No lanzamos el error para que el proceso de publicación continúe
    }
  },

  /**
   * Crear observaciones desde transacciones TU (solo lectura)
   * NOTA: Esta función está simplificada por limitaciones de tipos de Supabase
   * En producción, sería implementada como un Edge Function o proceso batch
   */
  async syncObservationsFromTU(projectId: string, fromDate?: string, toDate?: string): Promise<void> {
    // Esta función sería implementada como un proceso batch o Edge Function
    // que lee de TU y escribe observaciones de precios
    console.log('syncObservationsFromTU no implementado en frontend, usar Edge Function', {
      projectId,
      fromDate,
      toDate,
    });
    return Promise.resolve();
  },

  /**
   * Obtener estadísticas de precios para un WBS code y unidad
   */
  async getPriceStatistics(
    wbsCode: string,
    unit: string,
    windowDays: number = 90
  ): Promise<PriceStatistics | null> {
    try {
      // Calcular manualmente las estadísticas
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - windowDays);

      const { data: observations, error } = await supabase
        .from('planning_price_observations' as any)
        .select('pu_mxn, observation_date')
        .eq('wbs_code', wbsCode)
        .eq('unit', unit)
        .gte('observation_date', fromDate.toISOString().split('T')[0])
        .order('observation_date', { ascending: false });

      if (error) {
        console.error('Error obteniendo estadísticas de precios:', error);
        return null;
      }

      if (!observations || observations.length === 0) {
        return null;
      }

      // Calcular estadísticas
      const obs = observations as unknown as Array<{ pu_mxn: number; observation_date: string }>;
      const prices = obs.map(o => o.pu_mxn).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      const p25 = prices[Math.floor(prices.length * 0.25)];
      const p75 = prices[Math.floor(prices.length * 0.75)];
      const lastObservation = obs[0];

      return {
        median_price: median,
        p25_price: p25,
        p75_price: p75,
        last_seen_price: lastObservation.pu_mxn,
        last_seen_date: lastObservation.observation_date,
        sample_size: obs.length,
        recommended_pu: median,
      };
    } catch (error) {
      console.error('Error en getPriceStatistics:', error);
      return null;
    }
  },

  /**
   * Analizar precio y generar alertas si es necesario
   */
  analyzePriceDeviation(currentPrice: number, stats: PriceStatistics): PriceAlert | null {
    if (!stats || stats.sample_size === 0) {
      return null;
    }

    const median = new Decimal(stats.median_price);
    const current = new Decimal(currentPrice);
    
    const deviation = current.minus(median).div(median).mul(100).toNumber();
    const absDeviation = Math.abs(deviation);

    if (absDeviation >= DEVIATION_ERROR_THRESHOLD) {
      return {
        severity: 'error',
        message: `El precio se desvía ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}% de la mediana. Se requiere justificación.`,
        deviation_percentage: deviation,
        requires_justification: true,
      };
    } else if (absDeviation >= DEVIATION_WARNING_THRESHOLD) {
      return {
        severity: 'warning',
        message: `El precio se desvía ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}% de la mediana. Revise el precio.`,
        deviation_percentage: deviation,
        requires_justification: false,
      };
    }

    return null;
  },

  /**
   * Obtener umbrales de alerta configurados
   */
  getAlertThresholds() {
    return {
      warning: DEVIATION_WARNING_THRESHOLD,
      error: DEVIATION_ERROR_THRESHOLD,
    };
  },

  /**
   * Normalizar unidad si es posible
   */
  async normalizeUnit(fromUnit: string): Promise<{ unit: string; factor: number } | null> {
    try {
      // Tabla no está en tipos aún, por ahora retornar null
      // En producción se consultaría planning_unit_normalizations
      return null;
    } catch (error) {
      return null;
    }
  },
};
