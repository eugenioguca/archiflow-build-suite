import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search,
  FileX,
  MessageSquare,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';
import { useExecutiveBudgetShared } from '@/hooks/useExecutiveBudgetShared';
import { formatCurrency } from '@/lib/utils';

interface ExecutiveFinalFlatTableProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  onSwitchToControl?: () => void;
}

/**
 * Flat table component - exact clone of Planning's "Vista Final"
 * No accordions, no collapsibles, no grouping - just a single flat table
 */
export const ExecutiveFinalFlatTable: React.FC<ExecutiveFinalFlatTableProps> = ({ 
  selectedClientId, 
  selectedProjectId,
  onSwitchToControl
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use exact same data source as Planning's Vista Final
  const { 
    finalRows: executiveRows,
    totals: executiveTotals,
    isLoading: isLoadingExecutive,
    hasData: hasExecutiveData 
  } = useExecutiveBudgetShared(selectedClientId, selectedProjectId);

  if (isLoadingExecutive) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!hasExecutiveData) {
    return (
      <div className="text-center py-12">
        <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay datos del presupuesto ejecutivo</h3>
        <p className="text-muted-foreground mb-4">
          Crea subpartidas en el presupuesto ejecutivo para ver la vista final.
        </p>
      </div>
    );
  }

  // Filter rows based on search - same logic as Planning's Vista Final
  const filteredRows = executiveRows.filter(row => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      row.mayor_nombre.toLowerCase().includes(searchLower) ||
      row.partida_nombre.toLowerCase().includes(searchLower) ||
      (row.subpartida_nombre && row.subpartida_nombre.toLowerCase().includes(searchLower)) ||
      (row.mayor_codigo && row.mayor_codigo.toLowerCase().includes(searchLower)) ||
      (row.partida_codigo && row.partida_codigo.toLowerCase().includes(searchLower)) ||
      (row.subpartida_codigo && row.subpartida_codigo.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-4">
      {/* Search - matching Planning's Vista Final */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar mayor, partida o subpartida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Summary Stats - matching Planning's Vista Final */}
      {executiveTotals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(executiveTotals.totalParametrico)}</div>
            <div className="text-sm text-muted-foreground">Total Paramétrico</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(executiveTotals.totalEjecutivo)}</div>
            <div className="text-sm text-muted-foreground">Total Ejecutivo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(executiveTotals.totalResidual)}</div>
            <div className="text-sm text-muted-foreground">Total Residual</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">{executiveTotals.subpartidasCount} subpartidas</div>
            <div className="text-sm text-muted-foreground">{executiveTotals.partidasCount} partidas</div>
          </div>
        </div>
      )}

      {/* Flat Table - exact replica of Planning's Vista Final structure */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 font-medium border-b sticky top-0 z-10">
          Vista Final del Presupuesto Ejecutivo
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 sticky top-11 z-10">
              <tr>
                <th className="text-left p-3 font-medium sticky left-0 bg-muted/30 border-r">Concepto</th>
                <th className="text-left p-3 font-medium">Unidad</th>
                <th className="text-right p-3 font-medium">Cantidad</th>
                <th className="text-right p-3 font-medium">P.U.</th>
                <th className="text-right p-3 font-medium">Importe</th>
                <th className="text-center p-3 font-medium">Tipo</th>
                <th className="text-center p-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr 
                  key={row.id} 
                  className={`border-b hover:bg-muted/50 ${
                    row.tipo === 'residual' && row.estado === 'excedido' 
                      ? 'bg-red-50/50' 
                      : row.tipo === 'residual' 
                      ? 'bg-blue-50/50' 
                      : ''
                  }`}
                >
                  <td className={`p-3 sticky left-0 border-r ${
                    row.tipo === 'residual' && row.estado === 'excedido' 
                      ? 'bg-red-50/50' 
                      : row.tipo === 'residual' 
                      ? 'bg-blue-50/50' 
                      : 'bg-background'
                  }`}>
                    {/* Visual indentation based on tipo - matching Vista Final */}
                    <div className={`space-y-1 ${row.tipo === 'subpartida' ? 'pl-8' : row.tipo === 'residual' && row.parametrico_partida_id ? 'pl-4' : ''}`}>
                      {/* Mayor level */}
                      <div className={`${row.tipo === 'residual' ? 'font-semibold text-blue-900' : 'font-medium'}`}>
                        {row.mayor_codigo} - {row.mayor_nombre}
                      </div>
                      {/* Partida level */}
                      <div className={`text-sm ${row.tipo === 'residual' ? 'text-blue-700' : 'text-muted-foreground'} pl-2`}>
                        {row.partida_codigo} - {row.partida_nombre}
                      </div>
                      {/* Subpartida level (if exists) */}
                      {row.subpartida_nombre && (
                        <div className="text-sm text-foreground pl-4">
                          {row.subpartida_codigo} - {row.subpartida_nombre}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {row.unidad || '—'}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {row.cantidad ? row.cantidad.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {row.precio_unitario ? formatCurrency(row.precio_unitario) : '—'}
                  </td>
                  <td className={`p-3 text-right tabular-nums font-medium ${
                    row.tipo === 'residual' && row.estado === 'excedido' 
                      ? 'text-red-700' 
                      : row.tipo === 'residual' 
                      ? 'text-blue-700' 
                      : ''
                  }`}>
                    {formatCurrency(row.importe)}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={
                      row.tipo === 'residual' && row.estado === 'excedido' 
                        ? 'destructive' 
                        : row.tipo === 'residual' 
                        ? 'secondary' 
                        : 'outline'
                    }>
                      {row.tipo === 'residual' 
                        ? (row.estado === 'excedido' ? 'Excedido' : 'Residual')
                        : 'Subpartida'
                      }
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Notas">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {row.tipo === 'subpartida' && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Solicitar material">
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            title="Ver en Control de Construcción"
                            onClick={onSwitchToControl}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};