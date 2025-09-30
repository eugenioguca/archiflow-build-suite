/**
 * Versions List Component - Shows all published versions
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSnapshots } from '../../services/snapshotService';
import { formatAsCurrency } from '../../utils/monetary';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, FileText, Package } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { VersionsComparison } from './VersionsComparison';

interface VersionsListProps {
  budgetId: string;
}

export function VersionsList({ budgetId }: VersionsListProps) {
  const [showComparison, setShowComparison] = useState(false);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['planning-snapshots', budgetId],
    queryFn: () => getSnapshots(budgetId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="p-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          No hay versiones publicadas
        </h3>
        <p className="text-sm text-muted-foreground">
          Publica tu presupuesto desde la pestaña "Resumen y Publicar" para crear la primera versión
        </p>
      </div>
    );
  }

  if (showComparison) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Comparar Versiones</h2>
          <Button variant="outline" onClick={() => setShowComparison(false)}>
            Volver a Lista
          </Button>
        </div>
        <VersionsComparison budgetId={budgetId} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Versiones del Presupuesto</h2>
          <p className="text-sm text-muted-foreground">
            Historial de publicaciones inmutables
          </p>
        </div>
        {snapshots.length >= 2 && (
          <Button onClick={() => setShowComparison(true)}>
            Comparar Versiones
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {snapshots.map((snapshot, index) => (
          <Card key={snapshot.id} className={index === 0 ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-sm">
                    Versión {snapshot.version_number}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs">
                      Más reciente
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(snapshot.snapshot_date), "dd 'de' MMMM yyyy, HH:mm", {
                    locale: es,
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
                  <p className="text-lg font-semibold font-mono">
                    {formatAsCurrency(snapshot.totals.subtotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    IVA ({(snapshot.totals.iva_rate * 100).toFixed(0)}%)
                  </p>
                  <p className="text-lg font-semibold font-mono">
                    {formatAsCurrency(snapshot.totals.iva_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Gran Total</p>
                  <p className="text-xl font-bold font-mono text-primary">
                    {formatAsCurrency(snapshot.totals.grand_total)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Partidas:</span>
                  <span className="font-medium">{snapshot.totals.partidas.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Conceptos totales:</span>
                  <span className="font-medium">
                    {snapshot.totals.partidas.reduce(
                      (sum, p) => sum + p.conceptos_count,
                      0
                    )}
                  </span>
                </div>
                {snapshot.totals.retenciones > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Retenciones:</span>
                    <span className="font-medium">
                      {formatAsCurrency(snapshot.totals.retenciones)}
                    </span>
                  </div>
                )}
              </div>

              {snapshot.notes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Notas:</p>
                      <p className="text-sm">{snapshot.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
