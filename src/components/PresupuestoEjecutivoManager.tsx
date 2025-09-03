import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { usePresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyInput } from '@/components/CurrencyInput';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PresupuestoEjecutivoRow {
  id?: string;
  presupuesto_parametrico_id: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  subpartida_id: string;
  unidad: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
}

const UNIDADES = [
  { value: 'PZA', label: 'PZA - Pieza' },
  { value: 'M2', label: 'M2 - Metro Cuadrado' },
  { value: 'M3', label: 'M3 - Metro Cúbico' },
  { value: 'ML', label: 'ML - Metro Lineal' },
  { value: 'KG', label: 'KG - Kilogramo' },
  { value: 'TON', label: 'TON - Tonelada' },
  { value: 'LT', label: 'LT - Litro' },
  { value: 'GAL', label: 'GAL - Galón' },
  { value: 'M', label: 'M - Metro' }
];

export function PresupuestoEjecutivoManager() {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  const { presupuestos } = usePresupuestoParametrico(selectedClientId, selectedProjectId);
  
  const [selectedPresupuestoId, setSelectedPresupuestoId] = useState<string>('');
  
  const {
    presupuestosEjecutivo,
    createPresupuestoEjecutivo,
    updatePresupuestoEjecutivo,
    deletePresupuestoEjecutivo
  } = usePresupuestoEjecutivo(selectedClientId, selectedProjectId, selectedPresupuestoId);

  const [rows, setRows] = useState<PresupuestoEjecutivoRow[]>([]);

  // Fetch chart of accounts data
  const { data: subpartidas = [] } = useQuery({
    queryKey: ['subpartidas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('id, codigo, nombre, partida_id, departamento_aplicable, es_global')
        .eq('activo', true)
        .order('codigo');
      
      if (error) throw error;
      return data.map(item => ({
        value: item.id,
        label: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo,
        partida_id: item.partida_id,
        es_global: item.es_global,
        departamento_aplicable: item.departamento_aplicable
      }));
    },
  });

  const selectedPresupuesto = presupuestos.find(p => p.id === selectedPresupuestoId);

  const addSubpartida = () => {
    if (!selectedPresupuesto) return;

    const newRow: PresupuestoEjecutivoRow = {
      presupuesto_parametrico_id: selectedPresupuestoId,
      departamento: 'Construcción',
      mayor_id: selectedPresupuesto.mayor_id,
      partida_id: selectedPresupuesto.partida_id,
      subpartida_id: '',
      unidad: 'PZA',
      cantidad_requerida: 1,
      precio_unitario: 0,
      monto_total: 0
    };
    setRows([...rows, newRow]);
  };

  const updateRow = (index: number, field: keyof PresupuestoEjecutivoRow, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    
    // Auto-calculate monto_total
    if (field === 'cantidad_requerida' || field === 'precio_unitario') {
      updatedRows[index].monto_total = 
        updatedRows[index].cantidad_requerida * updatedRows[index].precio_unitario;
    }
    
    setRows(updatedRows);
  };

  const removeRow = (index: number) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  const saveRow = async (index: number) => {
    const row = rows[index];
    
    if (!selectedClientId || !selectedProjectId || !selectedPresupuestoId) {
      return;
    }

    if (!row.subpartida_id) {
      return;
    }

    try {
      if (row.id) {
        await updatePresupuestoEjecutivo.mutateAsync({
          id: row.id,
          data: {
            subpartida_id: row.subpartida_id,
            unidad: row.unidad,
            cantidad_requerida: row.cantidad_requerida,
            precio_unitario: row.precio_unitario
          }
        });
      } else {
        await createPresupuestoEjecutivo.mutateAsync({
          cliente_id: selectedClientId,
          proyecto_id: selectedProjectId,
          presupuesto_parametrico_id: selectedPresupuestoId,
          departamento: 'Construcción',
          mayor_id: row.mayor_id,
          partida_id: row.partida_id,
          subpartida_id: row.subpartida_id,
          unidad: row.unidad,
          cantidad_requerida: row.cantidad_requerida,
          precio_unitario: row.precio_unitario
        });
      }
      
      // Remove the row from local state after saving
      removeRow(index);
    } catch (error) {
      console.error('Error saving row:', error);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      await deletePresupuestoEjecutivo.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const getFilteredSubpartidas = (partidaId: string) => {
    return subpartidas.filter(sub => 
      sub.partida_id === partidaId || 
      (sub.es_global && sub.departamento_aplicable === 'Construcción')
    );
  };

  // Calculate totals and validation
  const totalEjecutivo = presupuestosEjecutivo.reduce((sum, item) => sum + item.monto_total, 0) +
    rows.reduce((sum, row) => sum + row.monto_total, 0);
  
  const totalParametrico = selectedPresupuesto?.monto_total || 0;
  const diferencia = totalEjecutivo - totalParametrico;
  const isValidTotal = Math.abs(diferencia) < 0.01; // Allow small rounding differences

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presupuesto Ejecutivo</h1>
          <p className="text-muted-foreground">
            Desglose detallado interno del presupuesto paramétrico por subpartidas
          </p>
        </div>
      </div>

      <CollapsibleFilters
        selectedClientId={selectedClientId}
        selectedProjectId={selectedProjectId}
        onClientChange={setClientId}
        onProjectChange={setProjectId}
        onClearFilters={clearFilters}
      />

      {hasFilters && (
        <>
          {/* Presupuesto Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Presupuesto Paramétrico</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchableCombobox
                items={presupuestos.map(p => ({
                  value: p.id,
                  label: `${p.mayor?.codigo} - ${p.partida?.codigo} | $${p.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                }))}
                value={selectedPresupuestoId}
                onValueChange={setSelectedPresupuestoId}
                placeholder="Seleccionar presupuesto paramétrico..."
                emptyText="No se encontraron presupuestos."
                className="w-full"
              />
            </CardContent>
          </Card>

          {selectedPresupuesto && (
            <>
              {/* Validation Alert */}
              {!isValidTotal && (
                <Alert variant={diferencia > 0 ? "destructive" : "default"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {diferencia > 0 
                      ? `El total ejecutivo excede al paramétrico por $${diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : `Faltan $${Math.abs(diferencia).toLocaleString('es-MX', { minimumFractionDigits: 2 })} para completar el presupuesto paramétrico`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Presupuesto Details */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Desglose: {selectedPresupuesto.mayor?.codigo} - {selectedPresupuesto.partida?.codigo}
                  </CardTitle>
                  <div className="flex justify-between text-sm">
                    <span>Total Paramétrico: <strong>${totalParametrico.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                    <span className={isValidTotal ? "text-green-600" : "text-red-600"}>
                      Total Ejecutivo: <strong>${totalEjecutivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                </CardHeader>
              </Card>

              {/* Subpartidas Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Subpartidas</CardTitle>
                  <Button onClick={addSubpartida} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Añadir Subpartida
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subpartida</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>Cantidad Req.</TableHead>
                          <TableHead>Precio Unitario</TableHead>
                          <TableHead>Monto Total</TableHead>
                          <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {presupuestosEjecutivo.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.subpartida?.codigo} - {item.subpartida?.nombre}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.unidad}</Badge>
                            </TableCell>
                            <TableCell>{item.cantidad_requerida}</TableCell>
                            <TableCell>
                              ${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${item.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRow(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {rows.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <SearchableCombobox
                                items={getFilteredSubpartidas(row.partida_id)}
                                value={row.subpartida_id}
                                onValueChange={(value) => updateRow(index, 'subpartida_id', value)}
                                placeholder="Seleccionar Subpartida..."
                                emptyText="No se encontraron subpartidas."
                                className="w-full min-w-[200px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={row.unidad}
                                onValueChange={(value) => updateRow(index, 'unidad', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIDADES.map((unidad) => (
                                    <SelectItem key={unidad.value} value={unidad.value}>
                                      {unidad.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={row.cantidad_requerida || ""}
                                placeholder="1"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    updateRow(index, 'cantidad_requerida', "");
                                  } else {
                                    const numValue = parseFloat(value);
                                    updateRow(index, 'cantidad_requerida', isNaN(numValue) ? "" : numValue);
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (isNaN(value) || value <= 0) {
                                    updateRow(index, 'cantidad_requerida', 1);
                                  }
                                }}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <CurrencyInput
                                value={row.precio_unitario}
                                onChange={(value) => updateRow(index, 'precio_unitario', value)}
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${row.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveRow(index)}
                                  disabled={!row.subpartida_id}
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRow(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!selectedPresupuestoId && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">
                  Selecciona un presupuesto paramétrico para ver y gestionar el desglose ejecutivo.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!hasFilters && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el presupuesto ejecutivo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}