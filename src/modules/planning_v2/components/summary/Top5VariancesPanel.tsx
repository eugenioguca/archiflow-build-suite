/**
 * Panel de Top 5 Variaciones más significativas
 */
import { useMemo } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatAsCurrency, toDisplayPrecision } from '../../utils/monetary';
import { cn } from '@/lib/utils';

interface VarianceItem {
  partidaId: string;
  partidaName: string;
  presupuesto: number;
  ejercido: number;
  variacion: number;
  variacionPct: number;
}

interface Top5VariancesPanelProps {
  partidas: VarianceItem[];
  loading?: boolean;
}

export function Top5VariancesPanel({ partidas, loading }: Top5VariancesPanelProps) {
  const top5Variances = useMemo(() => {
    return [...partidas]
      .sort((a, b) => Math.abs(b.variacion) - Math.abs(a.variacion))
      .slice(0, 5);
  }, [partidas]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top 5 Variaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Calculando variaciones...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (top5Variances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top 5 Variaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay datos de ejercido para calcular variaciones
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Top 5 Variaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {top5Variances.map((item, index) => {
          const isOverBudget = item.variacion < 0;
          const absVariation = Math.abs(item.variacion);
          const progressValue = item.presupuesto > 0 
            ? Math.min((item.ejercido / item.presupuesto) * 100, 150) 
            : 0;

          return (
            <div key={item.partidaId} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium text-sm">{item.partidaName}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>P: {formatAsCurrency(item.presupuesto)}</span>
                    <span>E: {formatAsCurrency(item.ejercido)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={cn(
                      'font-mono font-semibold',
                      isOverBudget
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {isOverBudget ? '-' : '+'}{formatAsCurrency(absVariation)}
                  </div>
                  <div
                    className={cn(
                      'text-xs font-medium',
                      isOverBudget
                        ? 'text-red-600/80 dark:text-red-400/80'
                        : 'text-green-600/80 dark:text-green-400/80'
                    )}
                  >
                    {isOverBudget ? '' : '+'}{toDisplayPrecision(item.variacionPct, 1)}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Progress
                  value={progressValue}
                  className={cn(
                    'h-2',
                    isOverBudget && '[&>div]:bg-red-500'
                  )}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {isOverBudget ? (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <TrendingDown className="h-3 w-3" />
                        Sobreejercido
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <TrendingUp className="h-3 w-3" />
                        Subejercido
                      </span>
                    )}
                  </span>
                  <span>
                    {toDisplayPrecision((item.ejercido / item.presupuesto) * 100, 1)}% ejercido
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
