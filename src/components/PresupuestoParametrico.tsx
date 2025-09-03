import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyInput } from '@/components/CurrencyInput';

interface PresupuestoRow {
  id?: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
}

export function PresupuestoParametrico() {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  const {
    presupuestos,
    isLoading,
    createPresupuesto,
    updatePresupuesto,
    deletePresupuesto
  } = usePresupuestoParametrico(selectedClientId, selectedProjectId);

  const [rows, setRows] = useState<PresupuestoRow[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);

  // Fetch chart of accounts data
  const { data: mayores = [] } = useQuery({
    queryKey: ['mayores', 'Construcción'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, codigo, nombre')
        .eq('departamento', 'Construcción')
        .eq('activo', true)
        .order('codigo');
      
      if (error) throw error;
      return data.map(item => ({
        value: item.id,
        label: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo
      }));
    },
  });

  const { data: partidas = [] } = useQuery({
    queryKey: ['partidas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts_partidas')
        .select('id, codigo, nombre, mayor_id')
        .eq('activo', true)
        .order('codigo');
      
      if (error) throw error;
      return data.map(item => ({
        value: item.id,
        label: `${item.codigo} - ${item.nombre}`,
        codigo: item.codigo,
        mayor_id: item.mayor_id
      }));
    },
  });

  const addRow = () => {
    const newRow: PresupuestoRow = {
      departamento: 'Construcción',
      mayor_id: '',
      partida_id: '',
      cantidad_requerida: 1,
      precio_unitario: 0,
      monto_total: 0
    };
    setRows([...rows, newRow]);
  };

  const updateRow = (index: number, field: keyof PresupuestoRow, value: any) => {
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
    
    if (!selectedClientId || !selectedProjectId) {
      return;
    }

    if (!row.mayor_id || !row.partida_id) {
      return;
    }

    try {
      if (row.id) {
        await updatePresupuesto.mutateAsync({
          id: row.id,
          data: {
            mayor_id: row.mayor_id,
            partida_id: row.partida_id,
            cantidad_requerida: row.cantidad_requerida,
            precio_unitario: row.precio_unitario
          }
        });
      } else {
        await createPresupuesto.mutateAsync({
          cliente_id: selectedClientId,
          proyecto_id: selectedProjectId,
          departamento: 'Construcción',
          mayor_id: row.mayor_id,
          partida_id: row.partida_id,
          cantidad_requerida: row.cantidad_requerida,
          precio_unitario: row.precio_unitario
        });
      }
      
      setEditingRow(null);
    } catch (error) {
      console.error('Error saving row:', error);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      await deletePresupuesto.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const getFilteredPartidas = (mayorId: string) => {
    return partidas.filter(partida => partida.mayor_id === mayorId);
  };

  const totalGeneral = presupuestos.reduce((sum, item) => sum + item.monto_total, 0) +
    rows.reduce((sum, row) => sum + row.monto_total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presupuesto Paramétrico</h1>
          <p className="text-muted-foreground">
            Gestiona el presupuesto de primer nivel presentado a clientes
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Partidas del Presupuesto</CardTitle>
            <Button onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Añadir Partida
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Mayor</TableHead>
                    <TableHead>Partida</TableHead>
                    <TableHead>Cantidad Req.</TableHead>
                    <TableHead>Precio Unitario</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presupuestos.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="secondary">{item.departamento}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.mayor?.codigo} - {item.mayor?.nombre}
                      </TableCell>
                      <TableCell>
                        {item.partida?.codigo} - {item.partida?.nombre}
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
                        <Badge variant="secondary">Construcción</Badge>
                      </TableCell>
                      <TableCell>
                        <SearchableCombobox
                          items={mayores}
                          value={row.mayor_id}
                          onValueChange={(value) => {
                            updateRow(index, 'mayor_id', value);
                            updateRow(index, 'partida_id', ''); // Reset partida when mayor changes
                          }}
                          placeholder="Seleccionar Mayor..."
                          emptyText="No se encontraron mayores."
                          className="w-full min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <SearchableCombobox
                          items={getFilteredPartidas(row.mayor_id)}
                          value={row.partida_id}
                          onValueChange={(value) => updateRow(index, 'partida_id', value)}
                          placeholder="Seleccionar Partida..."
                          emptyText="No se encontraron partidas."
                          disabled={!row.mayor_id}
                          className="w-full min-w-[200px]"
                        />
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
                            disabled={!row.mayor_id || !row.partida_id}
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
            
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <div className="text-2xl font-bold">
                  Total General: ${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasFilters && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el presupuesto paramétrico.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}