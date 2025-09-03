import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { useClientProjectFilters } from '@/hooks/useClientProjectFilters';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import { PresupuestoParametricoFormModal } from '@/components/modals/PresupuestoParametricoFormModal';
import { supabase } from '@/integrations/supabase/client';

// Form data interface for modal
interface PresupuestoFormData {
  departamento_id: string;
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

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Handle form submission for create/edit
  const handleFormSubmit = async (data: PresupuestoFormData) => {
    if (!selectedClientId || !selectedProjectId) {
      throw new Error('Cliente y proyecto son requeridos');
    }

    try {
      if (editingItem) {
        await updatePresupuesto.mutateAsync({
          id: editingItem.id,
          data: {
            departamento: data.departamento_id,
            mayor_id: data.mayor_id,
            partida_id: data.partida_id,
            cantidad_requerida: data.cantidad_requerida,
            precio_unitario: data.precio_unitario
          }
        });
        setEditingItem(null);
      } else {
        await createPresupuesto.mutateAsync({
          cliente_id: selectedClientId,
          proyecto_id: selectedProjectId,
          departamento: data.departamento_id,
          mayor_id: data.mayor_id,
          partida_id: data.partida_id,
          cantidad_requerida: data.cantidad_requerida,
          precio_unitario: data.precio_unitario
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  };

  // Handle opening new form modal
  const handleNewPartida = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  // Handle opening edit form modal
  const handleEditPartida = (item: any) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  // Handle delete partida
  const handleDeletePartida = async (id: string) => {
    try {
      await deletePresupuesto.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting partida:', error);
    }
  };

  const totalGeneral = presupuestos.reduce((sum, item) => sum + item.monto_total, 0);

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Header with Dovita logo
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DOVITA CONSTRUCCIONES', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('PRESUPUESTO PARAMÉTRICO', 105, 30, { align: 'center' });

    // Project info
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 15, 45);
    
    // Table headers
    let currentY = 60;
    const rowHeight = 8;
    const colWidths = [35, 40, 40, 25, 30, 30];
    const headers = ['Departamento', 'Mayor', 'Partida', 'Cantidad', 'P. Unitario', 'Monto Total'];
    
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
    const allItems = presupuestos.map(item => ({
      departamento: item.departamento,
      mayor_codigo: item.mayor ? `${item.mayor.codigo}` : '',
      partida_codigo: item.partida ? `${item.partida.codigo}` : '',
      cantidad_requerida: item.cantidad_requerida,
      precio_unitario: item.precio_unitario,
      monto_total: item.monto_total
    }));
    
    allItems.forEach((item) => {
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
        
        // Redraw headers on new page
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(15, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        
        let headerX = 15;
        headers.forEach((header, index) => {
          doc.text(header, headerX + 2, currentY + 5);
          headerX += colWidths[index];
        });
        
        currentY += rowHeight;
        doc.setFont('helvetica', 'normal');
      }

      // Draw row
      currentX = 15;
      const rowData = [
        item.departamento,
        item.mayor_codigo,
        item.partida_codigo,
        item.cantidad_requerida.toString(),
        `$${item.precio_unitario.toLocaleString('es-MX')}`,
        `$${item.monto_total.toLocaleString('es-MX')}`
      ];

      rowData.forEach((data, index) => {
        doc.text(data, currentX + 2, currentY + 5);
        currentX += colWidths[index];
      });
      
      currentY += rowHeight;
    });

    // Total
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL GENERAL: $${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 
             200, currentY, { align: 'right' });

    // Save PDF
    doc.save(`Presupuesto_Parametrico_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
            <div className="flex gap-2">
              {presupuestos.length > 0 && (
                <Button onClick={exportToPDF} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              )}
              <Button onClick={handleNewPartida} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Partida
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPartida(item);
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
                              handleDeletePartida(item.id);
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

      {/* Form Modal */}
      <PresupuestoParametricoFormModal
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSubmit={handleFormSubmit}
        initialData={editingItem ? {
          departamento_id: editingItem.departamento,
          mayor_id: editingItem.mayor_id,
          partida_id: editingItem.partida_id,
          cantidad_requerida: editingItem.cantidad_requerida,
          precio_unitario: editingItem.precio_unitario,
          monto_total: editingItem.monto_total,
        } : undefined}
        clienteId={selectedClientId}
        proyectoId={selectedProjectId}
        title={editingItem ? "Editar Partida - Presupuesto Paramétrico" : "Nueva Partida - Presupuesto Paramétrico"}
      />

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