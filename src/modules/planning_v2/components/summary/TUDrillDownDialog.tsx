/**
 * Dialog para mostrar transacciones de TU relacionadas a una partida
 */
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Calendar, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatAsCurrency } from '../../utils/monetary';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TUDrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partidaId: string;
  partidaName: string;
  wbsCode?: string;
}

export function TUDrillDownDialog({
  open,
  onOpenChange,
  partidaId,
  partidaName,
  wbsCode,
}: TUDrillDownDialogProps) {
  // Fetch transactions from TU for this partida (and optionally WBS)
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['tu-transactions', partidaId, wbsCode],
    queryFn: async () => {
      let query = supabase
        .from('unified_financial_transactions')
        .select(`
          id,
          fecha,
          tipo_movimiento,
          monto_total,
          descripcion,
          referencia_unica,
          departamento
        `)
        .eq('partida_id', partidaId);

      // If wbsCode is provided, filter by subpartida that matches the WBS
      if (wbsCode) {
        // Get the subpartida_id that corresponds to this WBS code
        const { data: wbsData } = await supabase
          .from('chart_of_accounts_subpartidas')
          .select('id')
          .eq('codigo', wbsCode)
          .single();
        
        if (wbsData?.id) {
          query = query.eq('subpartida_id', wbsData.id);
        }
      }

      const { data, error } = await query
        .order('fecha', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const total = transactions?.reduce((sum, tx) => sum + (tx.monto_total || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transacciones de TU - {partidaName}</DialogTitle>
          <DialogDescription>
            Mostrando hasta las últimas 100 transacciones de Transacciones Unificadas
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-3 border-y">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-lg font-bold font-mono">
              {formatAsCurrency(total)}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`/unified-transactions?partida=${partidaId}`, '_blank');
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver en TU
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando transacciones...
            </div>
          ) : transactions && transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(tx.fecha), 'dd/MM/yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tx.tipo_movimiento}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {tx.descripcion || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {tx.referencia_unica || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAsCurrency(tx.monto_total || 0)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.open(`/unified-transactions?tx=${tx.id}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron transacciones para esta partida
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
