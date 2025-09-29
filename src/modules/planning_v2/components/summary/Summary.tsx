/**
 * Budget Summary Tab Component
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileCheck, 
  Calculator, 
  Lock, 
  TrendingUp,
  Settings as SettingsIcon,
} from 'lucide-react';
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

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
    onError: () => {
      toast({
        title: 'Error al publicar',
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
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending || isPublished}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              {isPublished ? 'Publicado' : 'Publicar Versión'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Partidas Summary */}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partida</TableHead>
                    <TableHead className="text-right">Conceptos</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totals?.partidas.map((partida) => (
                    <TableRow key={partida.partida_id}>
                      <TableCell className="font-medium">
                        {partida.partida_name}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {partida.conceptos_count}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAsCurrency(partida.subtotal)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        —
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}
