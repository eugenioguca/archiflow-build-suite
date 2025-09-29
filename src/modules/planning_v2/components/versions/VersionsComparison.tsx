/**
 * Version Comparison Component
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { getSnapshots, compareSnapshots, type SnapshotComparison } from '../../services/snapshotService';
import { formatAsCurrency, toDisplayPrecision } from '../../utils/monetary';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VersionsComparisonProps {
  budgetId: string;
}

export function VersionsComparison({ budgetId }: VersionsComparisonProps) {
  const [snapshotId1, setSnapshotId1] = useState<string>('');
  const [snapshotId2, setSnapshotId2] = useState<string>('');

  // Fetch snapshots
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['planning-snapshots', budgetId],
    queryFn: () => getSnapshots(budgetId),
  });

  // Fetch comparison
  const { data: comparison } = useQuery({
    queryKey: ['planning-comparison', snapshotId1, snapshotId2],
    queryFn: () => compareSnapshots(snapshotId1, snapshotId2),
    enabled: !!snapshotId1 && !!snapshotId2,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cargando versiones...
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No hay versiones para comparar
        </h3>
        <p className="text-sm text-muted-foreground">
          Necesitas al menos 2 versiones publicadas para comparar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">Comparación de Versiones</h2>
        <p className="text-sm text-muted-foreground">
          Analiza las diferencias entre dos versiones del presupuesto
        </p>
      </div>

      {/* Version Selectors */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Versión Base</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={snapshotId1} onValueChange={setSnapshotId1}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar versión" />
              </SelectTrigger>
              <SelectContent>
                {snapshots.map((snapshot) => (
                  <SelectItem key={snapshot.id} value={snapshot.id}>
                    Versión {snapshot.version_number} -{' '}
                    {format(new Date(snapshot.snapshot_date), 'dd MMM yyyy', {
                      locale: es,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <ArrowRight className="h-8 w-8 text-muted-foreground" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Versión a Comparar</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={snapshotId2} onValueChange={setSnapshotId2}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar versión" />
              </SelectTrigger>
              <SelectContent>
                {snapshots.map((snapshot) => (
                  <SelectItem key={snapshot.id} value={snapshot.id}>
                    Versión {snapshot.version_number} -{' '}
                    {format(new Date(snapshot.snapshot_date), 'dd MMM yyyy', {
                      locale: es,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Diferencia en Gran Total</CardTitle>
              <CardDescription>
                Variación del monto total entre versiones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {comparison.delta_grand_total > 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : comparison.delta_grand_total < 0 ? (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  ) : (
                    <Minus className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-2xl font-bold">
                      {formatAsCurrency(Math.abs(comparison.delta_grand_total))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {comparison.delta_percentage > 0 ? '+' : ''}
                      {toDisplayPrecision(comparison.delta_percentage, 2)}%
                    </div>
                  </div>
                </div>

                <Badge
                  variant={
                    comparison.delta_grand_total > 0
                      ? 'default'
                      : comparison.delta_grand_total < 0
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {comparison.delta_grand_total > 0
                    ? 'Incremento'
                    : comparison.delta_grand_total < 0
                    ? 'Decremento'
                    : 'Sin cambios'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cambios por Partida</CardTitle>
              <CardDescription>
                Detalle de modificaciones en cada partida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partida</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">V{comparison.version_from}</TableHead>
                    <TableHead className="text-right">V{comparison.version_to}</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.partidas_changes.map((change, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {change.partida_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            change.status === 'added'
                              ? 'default'
                              : change.status === 'removed'
                              ? 'destructive'
                              : change.status === 'modified'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {change.status === 'added' && <Plus className="h-3 w-3 mr-1" />}
                          {change.status === 'removed' && <Minus className="h-3 w-3 mr-1" />}
                          {change.status === 'added'
                            ? 'Nueva'
                            : change.status === 'removed'
                            ? 'Eliminada'
                            : change.status === 'modified'
                            ? 'Modificada'
                            : 'Sin cambios'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {change.subtotal_from !== null
                          ? formatAsCurrency(change.subtotal_from)
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {change.subtotal_to !== null
                          ? formatAsCurrency(change.subtotal_to)
                          : '—'}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          change.delta > 0
                            ? 'text-green-600'
                            : change.delta < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {change.delta !== 0
                          ? `${change.delta > 0 ? '+' : ''}${formatAsCurrency(
                              change.delta
                            )}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
