/**
 * Chip que muestra información de referencia de precios
 */
import { AlertCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePriceIntelligence } from '../../hooks/usePriceIntelligence';
import { formatAsCurrency } from '../../utils/monetary';

interface PriceReferenceChipProps {
  wbsCode: string | null;
  unit: string | null;
  currentPrice: number | null;
  windowDays?: number;
}

export function PriceReferenceChip({
  wbsCode,
  unit,
  currentPrice,
  windowDays = 90,
}: PriceReferenceChipProps) {
  const { stats, alert, hasAlert, isLoading } = usePriceIntelligence({
    wbsCode,
    unit,
    currentPrice,
    windowDays,
    enabled: !!wbsCode && !!unit,
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs">
        <Info className="h-3 w-3 mr-1" />
        Analizando...
      </Badge>
    );
  }

  if (!stats || stats.sample_size === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs cursor-help">
              <Info className="h-3 w-3 mr-1" />
              Sin datos históricos
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>No hay observaciones de precios para este concepto</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const deviation = alert?.deviation_percentage ?? 0;
  const isPositiveDeviation = deviation > 0;

  const chipVariant = hasAlert
    ? alert?.severity === 'error'
      ? 'destructive'
      : 'default'
    : 'secondary';

  const DeviationIcon = isPositiveDeviation ? TrendingUp : TrendingDown;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={chipVariant} className="text-xs cursor-help flex items-center gap-1">
            {hasAlert ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <DeviationIcon className="h-3 w-3" />
            )}
            <span>
              Mediana {windowDays}d: {formatAsCurrency(stats.median_price)}
            </span>
            {currentPrice && (
              <span className="ml-1">
                · Δ {isPositiveDeviation ? '+' : ''}
                {deviation.toFixed(1)}%
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">Estadísticas de precio ({windowDays} días)</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Mediana:</span>
              <span className="font-medium">{formatAsCurrency(stats.median_price)}</span>
              
              <span className="text-muted-foreground">P25 - P75:</span>
              <span className="font-medium">
                {formatAsCurrency(stats.p25_price)} - {formatAsCurrency(stats.p75_price)}
              </span>
              
              <span className="text-muted-foreground">Último visto:</span>
              <span className="font-medium">{formatAsCurrency(stats.last_seen_price)}</span>
              
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium">
                {new Date(stats.last_seen_date).toLocaleDateString('es-MX')}
              </span>
              
              <span className="text-muted-foreground">Muestras:</span>
              <span className="font-medium">{stats.sample_size}</span>
            </div>
            
            {hasAlert && (
              <div className={`mt-2 p-2 rounded text-sm ${
                alert.severity === 'error' 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
              }`}>
                {alert.message}
              </div>
            )}
            
            {!hasAlert && currentPrice && (
              <div className="mt-2 text-sm text-muted-foreground">
                El precio está dentro del rango esperado
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
