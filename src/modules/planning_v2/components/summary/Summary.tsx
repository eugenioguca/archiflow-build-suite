/**
 * Budget Summary Tab Component
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileCheck, 
  Calculator, 
  Lock, 
  TrendingUp,
  Settings as SettingsIcon,
  AlertCircle,
} from 'lucide-react';
import { PublishButton } from './PublishButton';
import { getBudgetById } from '../../services/budgetService';
import { 
  calculateBudgetTotals, 
  publishBudget, 
  getSnapshots 
} from '../../services/snapshotService';
import { formatAsCurrency, toDisplayPrecision } from '../../utils/monetary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { tuActualsAdapter } from '../../adapters/tuActuals';
import { PLANNING_V2_TU_READONLY } from '../../config/featureFlag';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExpandablePartidaRow } from './ExpandablePartidaRow';
import { TUDrillDownDialog } from './TUDrillDownDialog';
import { Top5VariancesPanel } from './Top5VariancesPanel';
import { supabase } from '@/integrations/supabase/client';

interface SummaryProps {
  budgetId: string;
}

export function Summary({ budgetId }: SummaryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [includeIva, setIncludeIva] = useState(true);
  const [ivaRate, setIvaRate] = useState(0.16);
  const [includeRetenciones, setIncludeRetenciones] = useState(false);
  const [retencionesRate, setRetencionesRate] = useState(0);
  const [showActuals, setShowActuals] = useState(PLANNING_V2_TU_READONLY);
  const [drillDownPartida, setDrillDownPartida] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch budget data
  const { data: budgetData } = useQuery({
    queryKey: ['planning-budget', budgetId],
    queryFn: () => getBudgetById(budgetId),
  });

  // Calculate totals
  const { data: totals, isLoading: totalsLoading } = useQuery({
    queryKey: [
      'planning-totals',
      budgetId,
      includeIva ? ivaRate : 0,
      includeRetenciones ? retencionesRate : 0,
    ],
    queryFn: () =>
      calculateBudgetTotals(
        budgetId,
        includeIva ? ivaRate : 0,
        includeRetenciones ? retencionesRate : 0
      ),
  });

  // Fetch snapshots
  const { data: snapshots = [] } = useQuery({
    queryKey: ['planning-snapshots', budgetId],
    queryFn: () => getSnapshots(budgetId),
  });

  // Fetch actuals from TU (read-only) with timeout handling
  const { data: actualsData, isLoading: actualsLoading, error: actualsError } = useQuery({
    queryKey: ['planning-tu-actuals', budgetId, showActuals],
    queryFn: async () => {
      if (!showActuals || !PLANNING_V2_TU_READONLY) return null;

      const partidaIds = totals?.partidas.map(p => p.partida_id) || [];
      const actualsMap = new Map<string, number>();

      // Create timeout promise (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TU_TIMEOUT')), 5000);
      });

      // Fetch with timeout
      try {
        const fetchPromise = (async () => {
          for (const partidaId of partidaIds) {
            const actual = await tuActualsAdapter.getActualsForPartida(
              partidaId,
              budgetData?.budget.project_id
            );
            if (actual) {
              actualsMap.set(partidaId, actual.total_amount);
            }
          }
          return actualsMap;
        })();

        return await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error) {
        if (error instanceof Error && error.message === 'TU_TIMEOUT') {
          throw new Error('Tiempo de espera agotado al consultar TU');
        }
        throw error;
      }
    },
    enabled: showActuals && !!budgetData && !!totals,
    retry: false, // No retry on timeout
  });

  // TODO: Fetch subpartidas grouped by WBS - simplified for now
  const subpartidasMap = new Map<string, Map<string, any>>();

  // Calculate variance data for Top 5
  const varianceData = useMemo(() => {
    if (!totals?.partidas || !actualsData) return [];
    
    return totals.partidas.map(partida => {
      const ejercido = actualsData.get(partida.partida_id) || 0;
      const variacion = partida.subtotal - ejercido;
      const variacionPct = partida.subtotal > 0 ? (variacion / partida.subtotal) * 100 : 0;
      
      return {
        partidaId: partida.partida_id,
        partidaName: partida.partida_name,
        presupuesto: partida.subtotal,
        ejercido,
        variacion,
        variacionPct,
      };
    });
  }, [totals, actualsData]);

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: () =>
      publishBudget(budgetId, {
        ivaRate: includeIva ? ivaRate : 0,
        retencionesRate: includeRetenciones ? retencionesRate : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['planning-snapshots', budgetId] });
      toast({
        title: 'Presupuesto publicado',
        description: 'Se ha creado una nueva versión inmutable',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al publicar',
        description: error?.message || 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    },
  });

  const budget = budgetData?.budget;
  const isPublished = budget?.status === 'published';
  const isClosed = budget?.status === 'closed';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resumen Financiero</h2>
          <p className="text-sm text-muted-foreground">
            Totales consolidados e impuestos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={
            isClosed ? 'secondary' :
            isPublished ? 'default' : 
            'outline'
          }>
            {isClosed ? 'Cerrado' : isPublished ? 'Publicado' : 'Borrador'}
          </Badge>

          {snapshots.length > 0 && (
            <Badge variant="outline">
              Versión {snapshots[0]?.version_number || 1}
            </Badge>
          )}

          {!isClosed && (
            <PublishButton
              budgetId={budgetId}
              ivaRate={includeIva ? ivaRate : 0}
              retencionesRate={includeRetenciones ? retencionesRate : 0}
              disabled={publishMutation.isPending || isPublished}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Partidas Summary - Span 2 cols */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumen por Partida
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Calculando...
              </div>
            ) : (
              <>
                {PLANNING_V2_TU_READONLY && (
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show-actuals" className="cursor-pointer">
                          Mostrar Real vs Presupuesto
                        </Label>
                        <Switch
                          id="show-actuals"
                          checked={showActuals}
                          onCheckedChange={setShowActuals}
                        />
                      </div>
                    </div>
                    
                    {actualsError && showActuals && (
                      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                        <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-300">
                          No pudimos consultar TU ahora. Tus cálculos siguen disponibles.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partida</TableHead>
                      <TableHead className="text-right">Conceptos</TableHead>
                      <TableHead className="text-right">Presupuesto</TableHead>
                      {showActuals && PLANNING_V2_TU_READONLY && !actualsError && (
                        <>
                          <TableHead className="text-right">Ejercido (TU)</TableHead>
                          <TableHead className="text-right">Variación</TableHead>
                        </>
                      )}
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totals?.partidas.map((partida) => {
                      const actualAmount = actualsData?.get(partida.partida_id) || 0;
                      const subpartidas = subpartidasMap?.get(partida.partida_id);
                      const subpartidasArray = subpartidas 
                        ? Array.from(subpartidas.values())
                        : [];

                      return (
                        <ExpandablePartidaRow
                          key={partida.partida_id}
                          partidaId={partida.partida_id}
                          partidaName={partida.partida_name}
                          conceptosCount={partida.conceptos_count}
                          presupuesto={partida.subtotal}
                          ejercido={actualAmount}
                          showActuals={showActuals && PLANNING_V2_TU_READONLY && !actualsError}
                          actualsLoading={actualsLoading}
                          onDrillDown={(id) => setDrillDownPartida({ 
                            id, 
                            name: partida.partida_name 
                          })}
                          subpartidas={subpartidasArray}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Variaciones - New panel */}
        {showActuals && PLANNING_V2_TU_READONLY && !actualsError && (
          <Top5VariancesPanel
            partidas={varianceData}
            loading={actualsLoading}
          />
        )}

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Configuración Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="iva-switch" className="cursor-pointer">
                Incluir IVA
              </Label>
              <Switch
                id="iva-switch"
                checked={includeIva}
                onCheckedChange={setIncludeIva}
                disabled={isPublished || isClosed}
              />
            </div>

            {includeIva && (
              <div className="space-y-2">
                <Label>Tasa de IVA (%)</Label>
                <Input
                  type="number"
                  value={ivaRate * 100}
                  onChange={(e) => setIvaRate(parseFloat(e.target.value) / 100)}
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={isPublished || isClosed}
                />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="ret-switch" className="cursor-pointer">
                Incluir Retenciones
              </Label>
              <Switch
                id="ret-switch"
                checked={includeRetenciones}
                onCheckedChange={setIncludeRetenciones}
                disabled={isPublished || isClosed}
              />
            </div>

            {includeRetenciones && (
              <div className="space-y-2">
                <Label>Tasa de Retenciones (%)</Label>
                <Input
                  type="number"
                  value={retencionesRate * 100}
                  onChange={(e) =>
                    setRetencionesRate(parseFloat(e.target.value) / 100)
                  }
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={isPublished || isClosed}
                />
              </div>
            )}

            {(isPublished || isClosed) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <Lock className="h-4 w-4" />
                Configuración bloqueada en versión publicada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grand Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Totales Generales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Calculando...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">
                    {formatAsCurrency(totals?.subtotal || 0)}
                  </span>
                </div>

                {includeIva && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      IVA ({toDisplayPrecision(ivaRate * 100, 1)}%):
                    </span>
                    <span className="font-mono">
                      {formatAsCurrency(totals?.iva_amount || 0)}
                    </span>
                  </div>
                )}

                {includeRetenciones && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Retenciones ({toDisplayPrecision(retencionesRate * 100, 1)}%):
                    </span>
                    <span className="font-mono">
                      -{formatAsCurrency(totals?.retenciones || 0)}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Gran Total:</span>
                  <span className="font-mono">
                    {formatAsCurrency(totals?.grand_total || 0)}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground text-right">
                  Moneda: {budget?.currency || 'MXN'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down dialog */}
      {drillDownPartida && (
        <TUDrillDownDialog
          open={!!drillDownPartida}
          onOpenChange={(open) => !open && setDrillDownPartida(null)}
          partidaId={drillDownPartida.id}
          partidaName={drillDownPartida.name}
        />
      )}
    </div>
  );
}
