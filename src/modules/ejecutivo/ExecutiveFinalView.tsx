import { useState, useMemo } from 'react';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { useExecutiveBudget } from './hooks/useExecutiveBudget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Search, Calculator } from 'lucide-react';

interface ExecutiveFinalViewProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

interface FinalRowData {
  id: string;
  tipo: 'residual' | 'subpartida' | 'parametrico_sin_desagregar';
  departamento: string;
  mayor_codigo: string;
  mayor_nombre: string;
  partida_codigo: string;
  partida_nombre: string;
  subpartida_codigo?: string;
  subpartida_nombre?: string;
  unidad?: string;
  cantidad?: number;
  precio_unitario?: number;
  importe: number;
  estado?: 'dentro' | 'excedido';
  parametrico_partida_id?: string;
}

export default function ExecutiveFinalView({ selectedClientId, selectedProjectId }: ExecutiveFinalViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const hasFilters = Boolean(selectedClientId && selectedProjectId);

  // Load data
  const { presupuestos, isLoading: isLoadingParametric } = usePresupuestoParametrico(selectedClientId, selectedProjectId);
  const { executiveItems, isLoading: isLoadingExecutive } = useExecutiveBudget(selectedClientId, selectedProjectId);

  // Process data into final rows
  const finalRows: FinalRowData[] = useMemo(() => {
    if (!presupuestos.length) return [];

    const rows: FinalRowData[] = [];
    
    // Create a map of executive items by parametrico_id
    const executiveByParametricoId = new Map();
    
    executiveItems.forEach(item => {
      const parametricoId = item.partida_ejecutivo?.parametrico?.id;
      if (!parametricoId) return;
      
      if (!executiveByParametricoId.has(parametricoId)) {
        executiveByParametricoId.set(parametricoId, []);
      }
      executiveByParametricoId.get(parametricoId).push(item);
    });

    // Process each parametric item
    presupuestos.forEach(parametrico => {
      const executiveSubpartidas = executiveByParametricoId.get(parametrico.id) || [];
      const totalEjecutivo = executiveSubpartidas.reduce((sum, item) => sum + item.importe, 0);
      const residual = parametrico.monto_total - totalEjecutivo;
      const estado = residual >= 0 ? 'dentro' : 'excedido';

      // Add residual row (always)
      rows.push({
        id: `residual-${parametrico.id}`,
        tipo: 'residual',
        departamento: parametrico.departamento,
        mayor_codigo: parametrico.mayor?.codigo || '',
        mayor_nombre: parametrico.mayor?.nombre || '',
        partida_codigo: parametrico.partida?.codigo || '',
        partida_nombre: parametrico.partida?.nombre || '',
        importe: residual,
        estado,
        parametrico_partida_id: parametrico.id
      });

      // Add subpartida rows
      executiveSubpartidas.forEach(subpartida => {
        rows.push({
          id: `subpartida-${subpartida.id}`,
          tipo: 'subpartida',
          departamento: parametrico.departamento,
          mayor_codigo: parametrico.mayor?.codigo || '',
          mayor_nombre: parametrico.mayor?.nombre || '',
          partida_codigo: parametrico.partida?.codigo || '',
          partida_nombre: parametrico.partida?.nombre || '',
          subpartida_codigo: subpartida.codigo_snapshot || subpartida.subpartida?.codigo || '',
          subpartida_nombre: subpartida.nombre_snapshot || subpartida.subpartida?.nombre || '',
          unidad: subpartida.unidad,
          cantidad: subpartida.cantidad,
          precio_unitario: subpartida.precio_unitario,
          importe: subpartida.importe,
          parametrico_partida_id: parametrico.id
        });
      });
    });

    return rows;
  }, [presupuestos, executiveItems]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return finalRows.filter(row => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          row.departamento.toLowerCase().includes(searchLower) ||
          row.mayor_nombre.toLowerCase().includes(searchLower) ||
          row.partida_nombre.toLowerCase().includes(searchLower) ||
          (row.subpartida_nombre && row.subpartida_nombre.toLowerCase().includes(searchLower)) ||
          (row.subpartida_codigo && row.subpartida_codigo.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Department filter
      if (departmentFilter !== 'all' && row.departamento !== departmentFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'dentro' && row.estado !== 'dentro') return false;
        if (statusFilter === 'excedido' && row.estado !== 'excedido') return false;
        if (statusFilter === 'residual' && row.tipo !== 'residual') return false;
        if (statusFilter === 'subpartidas' && row.tipo !== 'subpartida') return false;
      }

      return true;
    });
  }, [finalRows, searchTerm, departmentFilter, statusFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalParametrico = presupuestos.reduce((sum, item) => sum + item.monto_total, 0);
    const totalEjecutivo = executiveItems.reduce((sum, item) => sum + item.importe, 0);
    const totalResidual = finalRows
      .filter(row => row.tipo === 'residual')
      .reduce((sum, row) => sum + row.importe, 0);

    return {
      totalParametrico,
      totalEjecutivo,
      totalResidual,
      diferencia: totalParametrico - totalEjecutivo
    };
  }, [presupuestos, executiveItems, finalRows]);

  const isLoading = isLoadingParametric || isLoadingExecutive;
  const departments = Array.from(new Set(finalRows.map(row => row.departamento)));

  if (!hasFilters) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Presupuesto Ejecutivo — Vista Final</h1>
          <p className="text-muted-foreground text-lg">
            Vista consolidada lista para revisión y exportación
          </p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Selecciona Cliente y Proyecto</h3>
            <p className="text-muted-foreground">
              Utiliza los filtros superiores para seleccionar un cliente y proyecto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Vista Final del Presupuesto</h1>
          <p className="text-muted-foreground text-lg">
            Tabla consolidada con residuales paramétricos y subpartidas ejecutivas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando datos...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Totals Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Totales Consolidados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Paramétrico</p>
                  <p className="text-2xl font-bold text-primary">
                    ${totals.totalParametrico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Ejecutivo</p>
                  <p className="text-2xl font-bold">
                    ${totals.totalEjecutivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Residual</p>
                  <p className={`text-2xl font-bold ${totals.totalResidual >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    ${totals.totalResidual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Diferencia</p>
                  <p className={`text-2xl font-bold ${Math.abs(totals.diferencia) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                    ${Math.abs(totals.diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en departamento, mayor, partida o subpartida..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="residual">Solo residuales</SelectItem>
                    <SelectItem value="subpartidas">Solo subpartidas</SelectItem>
                    <SelectItem value="dentro">Dentro de presupuesto</SelectItem>
                    <SelectItem value="excedido">Excedido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Departamento</th>
                      <th className="text-left p-4 font-semibold">Mayor</th>
                      <th className="text-left p-4 font-semibold">Partida</th>
                      <th className="text-left p-4 font-semibold">Subpartida</th>
                      <th className="text-center p-4 font-semibold">Unidad</th>
                      <th className="text-center p-4 font-semibold">Cantidad</th>
                      <th className="text-right p-4 font-semibold">P.U.</th>
                      <th className="text-right p-4 font-semibold">Importe</th>
                      <th className="text-center p-4 font-semibold">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/20">
                        <td className="p-4">{row.departamento}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{row.mayor_nombre}</p>
                            <p className="text-xs text-muted-foreground">{row.mayor_codigo}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{row.partida_nombre}</p>
                            <p className="text-xs text-muted-foreground">{row.partida_codigo}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          {row.subpartida_nombre ? (
                            <div>
                              <p className="font-medium">{row.subpartida_nombre}</p>
                              <p className="text-xs text-muted-foreground">{row.subpartida_codigo}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.unidad || '—'}
                        </td>
                        <td className="p-4 text-center">
                          {row.cantidad ? row.cantidad.toLocaleString('es-MX') : '—'}
                        </td>
                        <td className="p-4 text-right">
                          {row.precio_unitario 
                            ? `$${row.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                            : '—'
                          }
                        </td>
                        <td className={`p-4 text-right font-semibold ${
                          row.tipo === 'residual' && row.estado === 'excedido' 
                            ? 'text-destructive' 
                            : row.tipo === 'residual' && row.importe > 0
                            ? 'text-green-600'
                            : ''
                        }`}>
                          ${Math.abs(row.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={
                            row.tipo === 'residual' 
                              ? (row.estado === 'excedido' ? 'destructive' : 'secondary')
                              : 'outline'
                          }>
                            {row.tipo === 'residual' 
                              ? (row.estado === 'excedido' ? 'Excedido' : 'Residual Paramétrico')
                              : 'Subpartida Ejecutiva'
                            }
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredRows.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No se encontraron registros que coincidan con los filtros
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}