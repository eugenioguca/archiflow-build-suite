import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import { useCronogramaGantt } from '@/hooks/useCronogramaGantt';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { CronogramaGanttFormModal } from '@/components/modals/CronogramaGanttFormModal';
import { format } from 'date-fns';

// Form data interface for modal
interface CronogramaFormData {
  departamento_id: string;
  mayor_id: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  duracion_dias: number;
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

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Handle form submission for create/edit
  const handleFormSubmit = async (data: CronogramaFormData) => {
    if (!selectedClientId || !selectedProjectId) {
      throw new Error('Cliente y proyecto son requeridos');
    }

    try {
      if (editingItem) {
        await updateCronograma.mutateAsync({
          id: editingItem.id,
          data: {
            departamento: data.departamento_id,
            mayor_id: data.mayor_id,
            fecha_inicio: format(data.fecha_inicio, 'yyyy-MM-dd'),
            fecha_fin: format(data.fecha_fin, 'yyyy-MM-dd')
          }
        });
        setEditingItem(null);
      } else {
        await createCronograma.mutateAsync({
          cliente_id: selectedClientId,
          proyecto_id: selectedProjectId,
          departamento: data.departamento_id,
          mayor_id: data.mayor_id,
          fecha_inicio: format(data.fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(data.fecha_fin, 'yyyy-MM-dd')
        });
      }
    } catch (error) {
      console.error('Error submitting cronograma form:', error);
      throw error;
    }
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

  // Handle delete activity
  const handleDeleteActividad = async (id: string) => {
    try {
      await deleteCronograma.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting activity:', error);
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditActividad(item);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteActividad(item.id);
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
        initialData={editingItem ? {
          departamento_id: editingItem.departamento,
          mayor_id: editingItem.mayor_id,
          fecha_inicio: new Date(editingItem.fecha_inicio),
          fecha_fin: new Date(editingItem.fecha_fin),
          duracion_dias: editingItem.duracion,
        } : undefined}
        clienteId={selectedClientId}
        proyectoId={selectedProjectId}
        title={editingItem ? "Editar Actividad - Cronograma" : "Nueva Actividad - Cronograma"}
      />

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