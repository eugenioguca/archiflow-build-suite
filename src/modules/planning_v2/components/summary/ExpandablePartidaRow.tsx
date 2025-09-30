/**
 * Expandable Partida Row with Subpartida drill-down
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAsCurrency, toDisplayPrecision } from '../../utils/monetary';
import { cn } from '@/lib/utils';

interface Subpartida {
  wbs_code: string;
  conceptos_count: number;
  subtotal: number;
  actual_amount?: number;
}

interface ExpandablePartidaRowProps {
  partidaId: string;
  partidaName: string;
  conceptosCount: number;
  presupuesto: number;
  ejercido?: number;
  showActuals: boolean;
  actualsLoading: boolean;
  onDrillDown?: (partidaId: string) => void;
  subpartidas?: Subpartida[];
}

export function ExpandablePartidaRow({
  partidaId,
  partidaName,
  conceptosCount,
  presupuesto,
  ejercido = 0,
  showActuals,
  actualsLoading,
  onDrillDown,
  subpartidas = [],
}: ExpandablePartidaRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const variacion = presupuesto - ejercido;
  const variacionPct = presupuesto > 0 ? (variacion / presupuesto) * 100 : 0;
  
  const hasSubpartidas = subpartidas.length > 0;

  return (
    <>
      {/* Partida row */}
      <TableRow className="font-medium bg-muted/30">
        <TableCell>
          <div className="flex items-center gap-2">
            {hasSubpartidas ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            <span>{partidaName}</span>
          </div>
        </TableCell>
        
        <TableCell className="text-right text-muted-foreground">
          {conceptosCount}
        </TableCell>
        
        <TableCell className="text-right font-mono">
          {formatAsCurrency(presupuesto)}
        </TableCell>
        
        {showActuals && (
          <>
            <TableCell className="text-right font-mono">
              {actualsLoading ? (
                <span className="text-muted-foreground text-xs">Cargando...</span>
              ) : (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 font-mono"
                  onClick={() => onDrillDown?.(partidaId)}
                >
                  {formatAsCurrency(ejercido)}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </TableCell>
            
            <TableCell className="text-right font-mono">
              {actualsLoading ? (
                <span className="text-muted-foreground text-xs">—</span>
              ) : (
                <div className="space-y-0.5">
                  <div
                    className={cn(
                      variacion > 0
                        ? 'text-green-600 dark:text-green-400'
                        : variacion < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatAsCurrency(variacion)}
                  </div>
                  {variacion !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      ({toDisplayPrecision(variacionPct, 1)}%)
                    </div>
                  )}
                </div>
              )}
            </TableCell>
          </>
        )}
        
        <TableCell className="text-sm text-muted-foreground">—</TableCell>
      </TableRow>

      {/* Subpartidas rows */}
      {isExpanded && hasSubpartidas && subpartidas.map((subpartida) => {
        const subVariacion = subpartida.subtotal - (subpartida.actual_amount || 0);
        const subVariacionPct = subpartida.subtotal > 0 
          ? (subVariacion / subpartida.subtotal) * 100 
          : 0;

        return (
          <TableRow key={subpartida.wbs_code} className="bg-muted/10">
            <TableCell className="pl-12">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {subpartida.wbs_code}
                </Badge>
                <span className="text-sm text-muted-foreground">Subpartida</span>
              </div>
            </TableCell>
            
            <TableCell className="text-right text-sm text-muted-foreground">
              {subpartida.conceptos_count}
            </TableCell>
            
            <TableCell className="text-right font-mono text-sm">
              {formatAsCurrency(subpartida.subtotal)}
            </TableCell>
            
            {showActuals && (
              <>
                <TableCell className="text-right font-mono text-sm">
                  {formatAsCurrency(subpartida.actual_amount || 0)}
                </TableCell>
                
                <TableCell className="text-right font-mono text-sm">
                  <div className="space-y-0.5">
                    <div
                      className={cn(
                        subVariacion > 0
                          ? 'text-green-600 dark:text-green-400'
                          : subVariacion < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {formatAsCurrency(subVariacion)}
                    </div>
                    {subVariacion !== 0 && (
                      <div className="text-xs text-muted-foreground">
                        ({toDisplayPrecision(subVariacionPct, 1)}%)
                      </div>
                    )}
                  </div>
                </TableCell>
              </>
            )}
            
            <TableCell className="text-xs text-muted-foreground">—</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
