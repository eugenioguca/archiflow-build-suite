/**
 * Hook para usar inteligencia de precios en el catálogo
 */
import { useQuery } from '@tanstack/react-query';
import { priceIntelligenceService, PriceStatistics, PriceAlert } from '../services/priceIntelligenceService';

interface UsePriceIntelligenceOptions {
  wbsCode: string | null;
  unit: string | null;
  currentPrice: number | null;
  windowDays?: number;
  enabled?: boolean;
}

export function usePriceIntelligence({
  wbsCode,
  unit,
  currentPrice,
  windowDays = 90,
  enabled = true,
}: UsePriceIntelligenceOptions) {
  // Obtener estadísticas de precios
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['price-statistics', wbsCode, unit, windowDays],
    queryFn: async () => {
      if (!wbsCode || !unit) return null;
      return priceIntelligenceService.getPriceStatistics(wbsCode, unit, windowDays);
    },
    enabled: enabled && !!wbsCode && !!unit,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Analizar desviación del precio actual
  const alert: PriceAlert | null =
    stats && currentPrice ? priceIntelligenceService.analyzePriceDeviation(currentPrice, stats) : null;

  const hasAlert = !!alert;
  const requiresJustification = alert?.requires_justification ?? false;

  return {
    stats: stats as PriceStatistics | null,
    alert,
    hasAlert,
    requiresJustification,
    isLoading,
    error,
  };
}
