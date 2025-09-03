import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download } from 'lucide-react';
import { useCronogramaGantt } from '@/hooks/useCronogramaGantt';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { DatePicker } from '@/components/DatePicker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';

interface CronogramaRow {
  id?: string;
  departamento: string;
  mayor_id: string;
  fecha_inicio: Date | undefined;
  fecha_fin: Date | undefined;
  duracion: number;
}

export function CronogramaGantt() {
  const {
    selectedClientId,
    selectedProjectId,
    setClientId,
    setProjectId,
    clearFilters,
    hasFilters
  } = useClientProjectFilters();

  const {
    cronogramas,
    isLoading,
    createCronograma,
    updateCronograma,
    deleteCronograma
  } = useCronogramaGantt(selectedClientId, selectedProjectId);

  const [rows, setRows] = useState<CronogramaRow[]>([]);

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

  const addRow = () => {
    const newRow: CronogramaRow = {
      departamento: 'Construcción',
      mayor_id: '',
      fecha_inicio: undefined,
      fecha_fin: undefined,
      duracion: 0
    };
    setRows([...rows, newRow]);
  };

  const updateRow = (index: number, field: keyof CronogramaRow, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    
    // Auto-calculate duracion
    if (field === 'fecha_inicio' || field === 'fecha_fin') {
      const row = updatedRows[index];
      if (row.fecha_inicio && row.fecha_fin) {
        row.duracion = differenceInDays(row.fecha_fin, row.fecha_inicio);
      }
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

    if (!row.mayor_id || !row.fecha_inicio || !row.fecha_fin) {
      return;
    }

    try {
      if (row.id) {
        await updateCronograma.mutateAsync({
          id: row.id,
          data: {
            mayor_id: row.mayor_id,
            fecha_inicio: format(row.fecha_inicio, 'yyyy-MM-dd'),
            fecha_fin: format(row.fecha_fin, 'yyyy-MM-dd')
          }
        });
      } else {
        await createCronograma.mutateAsync({
          cliente_id: selectedClientId,
          proyecto_id: selectedProjectId,
          departamento: 'Construcción',
          mayor_id: row.mayor_id,
          fecha_inicio: format(row.fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(row.fecha_fin, 'yyyy-MM-dd')
        });
      }
    } catch (error) {
      console.error('Error saving row:', error);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      await deleteCronograma.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const exportToExcel = () => {
    // TODO: Implement Excel export functionality
    console.log('Export to Excel');
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Export to PDF');
  };

  const getDurationText = (duracion: number) => {
    if (duracion === 0) return '0 días';
    if (duracion < 7) return `${duracion} días`;
    if (duracion < 30) return `${Math.round(duracion / 7)} semanas`;
    return `${Math.round(duracion / 30)} meses`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cronograma de Gantt</h1>
          <p className="text-muted-foreground">
            Planificación visual del cronograma de construcción para presentar a clientes
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
            <CardTitle>Actividades del Cronograma</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={addRow} className="gap-2">
                <Plus className="h-4 w-4" />
                Añadir Actividad
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Mayor</TableHead>
                    <TableHead>Fecha de Inicio</TableHead>
                    <TableHead>Fecha de Fin</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cronogramas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="secondary">{item.departamento}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.mayor?.codigo} - {item.mayor?.nombre}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.fecha_inicio), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.fecha_fin), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getDurationText(item.duracion)}
                        </Badge>
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
                          onValueChange={(value) => updateRow(index, 'mayor_id', value)}
                          placeholder="Seleccionar Mayor..."
                          emptyText="No se encontraron mayores."
                          className="w-full min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <DatePicker
                          date={row.fecha_inicio}
                          onDateChange={(date) => updateRow(index, 'fecha_inicio', date)}
                          placeholder="Fecha inicio"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <DatePicker
                          date={row.fecha_fin}
                          onDateChange={(date) => updateRow(index, 'fecha_fin', date)}
                          placeholder="Fecha fin"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        {row.duracion > 0 ? (
                          <Badge variant="outline">
                            {getDurationText(row.duracion)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveRow(index)}
                            disabled={!row.mayor_id || !row.fecha_inicio || !row.fecha_fin}
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
      )}

      {!hasFilters && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">
              Selecciona un cliente y proyecto para ver y gestionar el cronograma de Gantt.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}