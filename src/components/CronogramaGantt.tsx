import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { useCronogramaGantt } from '@/hooks/useCronogramaGantt';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { DatePicker } from '@/components/DatePicker';
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

interface Option {
  id: string;
  nombre: string;
  codigo?: string;
}

// Transform Option to SearchableComboboxItem
const transformToComboboxItems = (options: Option[]) => {
  return options.map(option => ({
    value: option.id,
    label: option.nombre,
    codigo: option.codigo,
    searchText: `${option.codigo || ''} ${option.nombre}`.toLowerCase()
  }));
};

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

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Handle form submission for create/edit
  const handleFormSubmit = async (data: CronogramaFormData) => {
    // Implementation would go here - saving to cronograma table
    console.log('Cronograma form submitted:', data);
  };

  // Handle opening new form modal
  const handleNewActividad = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  // Handle opening edit form modal
  const handleEditActividad = (item: any) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  const addRow = () => {
    const newRow: CronogramaRow = {
      departamento: departamentoId || 'Construcción',
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
          departamento: departamentoId, // Usar departamento cargado de la DB
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
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DOVITA CONSTRUCCIONES', 140, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('CRONOGRAMA DE GANTT', 140, 30, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 15, 45);
    
    // Table
    let currentY = 60;
    const rowHeight = 8;
    const colWidths = [40, 50, 40, 40, 30];
    const headers = ['Departamento', 'Mayor', 'Fecha Inicio', 'Fecha Fin', 'Duración'];
    
    // Draw headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
    
    let currentX = 15;
    headers.forEach((header, index) => {
      doc.text(header, currentX + 2, currentY + 5);
      currentX += colWidths[index];
    });
    
    currentY += rowHeight;

    // Data rows
    doc.setFont('helvetica', 'normal');
    cronogramas.forEach((item) => {
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }

      currentX = 15;
      const rowData = [
        item.departamento,
        item.mayor ? `${item.mayor.codigo}` : '',
        format(new Date(item.fecha_inicio), 'dd/MM/yyyy'),
        format(new Date(item.fecha_fin), 'dd/MM/yyyy'),
        getDurationText(item.duracion)
      ];

      rowData.forEach((data, index) => {
        doc.text(data, currentX + 2, currentY + 5);
        currentX += colWidths[index];
      });
      
      currentY += rowHeight;
    });

    doc.save(`Cronograma_Gantt_${new Date().toISOString().split('T')[0]}.pdf`);
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
              <Button onClick={handleNewActividad} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Actividad
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
                         <div className="pointer-events-auto">
                           <SearchableCombobox
                             value={row.mayor_id}
                             onValueChange={(value) => updateRow(index, 'mayor_id', value)}
                             items={mayores}
                             searchPlaceholder="Buscar mayor..."
                             emptyText="No se encontraron mayores"
                             className="w-full pointer-events-auto"
                             disabled={!hasFilters || !departamentoId}
                           />
                         </div>
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
                             onClick={(e) => {
                               e.stopPropagation();
                               saveRow(index);
                             }}
                             disabled={!row.mayor_id || !row.fecha_inicio || !row.fecha_fin}
                           >
                             ✓
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               removeRow(index);
                             }}
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

      {/* Form Modal */}
      <CronogramaGanttFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
        clienteId={selectedClientId}
        proyectoId={selectedProjectId}
        title={editingItem ? "Editar Actividad - Cronograma" : "Nueva Actividad - Cronograma"}
      />
      }

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