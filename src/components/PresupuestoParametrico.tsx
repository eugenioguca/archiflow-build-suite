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
import dovitaLogo from '@/assets/dovita-logo.png';

// Form data interface for modal
interface PresupuestoFormData {
  departamento_id: string;
  mayor_id: string;
  partida_id: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
}

interface PresupuestoParametricoProps {
  selectedClientId?: string;
  selectedProjectId?: string;
}

export function PresupuestoParametrico({ 
  selectedClientId: propClientId, 
  selectedProjectId: propProjectId 
}: PresupuestoParametricoProps) {
  // Use props if provided, otherwise fall back to hook
  const hookFilters = useClientProjectFilters();
  const selectedClientId = propClientId || hookFilters.selectedClientId;
  const selectedProjectId = propProjectId || hookFilters.selectedProjectId;
  const hasFilters = selectedClientId !== '' && selectedProjectId !== '';

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
    // Get client and project info
    let clientInfo = null;
    let projectInfo = null;

    try {
      if (selectedClientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('nombre, email, telefono')
          .eq('id', selectedClientId)
          .single();
        clientInfo = client;
      }

      if (selectedProjectId && selectedClientId) {
        const { data: project } = await supabase
          .from('client_projects')
          .select('project_name, project_location')
          .eq('id', selectedProjectId)
          .eq('client_id', selectedClientId)
          .single();
        projectInfo = project;
      }
    } catch (error) {
      console.warn('Could not fetch client/project info for PDF:', error);
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Page dimensions for Letter size
    const pageWidth = 215.9; // Letter width in mm
    const pageHeight = 279.4; // Letter height in mm
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let currentPage = 1;
    let totalPages = 1; // We'll calculate this later

    // Function to draw header on each page - matching Gantt PDF design
    const drawHeader = () => {
      // Corporate header background - matching Gantt PDF colors
      doc.setFillColor(45, 75, 154); // #2D4B9A - Same as Gantt PDF corporateHeader
      doc.rect(0, 0, pageWidth, 30, 'F');

      // Add company logo - same as working Gantt PDF
      try {
        // Use the same logo file that works in Gantt PDF
        const logoUrl = window.location.origin + '/lovable-uploads/d967a2e5-99bb-4992-8a2d-f0887371c03c.png';
        doc.addImage(logoUrl, 'PNG', margin, 8, 50, 15);
      } catch (error) {
        console.warn('Could not load logo:', error);
        // Fallback to company name if logo fails
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('DOVITA', margin, 18);
      }

      // Company name - matching Gantt PDF style
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('DOVITA CONSTRUCCIONES', margin + 60, 18);

      // Document type on the right
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PRESUPUESTO PARAMÉTRICO', pageWidth - margin, 12, { align: 'right' });

      // Company info on the right - matching Gantt PDF style
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const companyInfo = [
        'Tel: +52 (55) 1234-5678',
        'Email: info@dovita.com.mx',
        'Monterrey, Nuevo León'
      ];
      
      companyInfo.forEach((info, index) => {
        doc.text(info, pageWidth - margin, 18 + (index * 3), { align: 'right' });
      });

      // Reset text color
      doc.setTextColor(0, 0, 0);
    };

    // Function to draw footer on each page - matching Gantt PDF design
    const drawFooter = (page: number, total: number) => {
      // Footer background - matching Gantt PDF footer style
      doc.setFillColor(248, 250, 252); // #F8FAFC - Light background matching Gantt
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

      // Footer border line
      doc.setDrawColor(30, 58, 138); // #1E3A8A - Primary blue matching Gantt
      doc.setLineWidth(0.5);
      doc.line(0, pageHeight - 15, pageWidth, pageHeight - 15);

      doc.setTextColor(31, 41, 55); // #1F2937 - Dark text matching Gantt
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('DOVITA • Confidencial', margin, pageHeight - 5);
      doc.text(`Página ${page} de ${total}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
    };

    // Calculate total pages needed (rough estimate)
    const itemsPerPage = Math.floor((pageHeight - 130) / 8); // Adjusted for larger header
    totalPages = Math.ceil(presupuestos.length / itemsPerPage);

    // Draw first page header and footer
    drawHeader();
    drawFooter(currentPage, totalPages);

    // Document title - matching Gantt PDF style
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // #1E3A8A - Primary blue matching Gantt
    doc.text('PRESUPUESTO PARAMÉTRICO', pageWidth / 2, 45, { align: 'center' });

    // Reset color
    doc.setTextColor(31, 41, 55); // #1F2937 - Dark text matching Gantt

    // Client and project information section
    let infoY = 55;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PROYECTO', margin, infoY);
    infoY += 8;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: '2-digit' 
    });
    doc.text(`Fecha de Generación: ${formattedDate}`, margin, infoY);
    infoY += 6;

    // Client info
    if (clientInfo) {
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente:', margin, infoY);
      doc.setFont('helvetica', 'normal');
      doc.text(clientInfo.nombre || 'No especificado', margin + 20, infoY);
      infoY += 5;

      if (clientInfo.email) {
        doc.text(`Email: ${clientInfo.email}`, margin, infoY);
        infoY += 5;
      }
      if (clientInfo.telefono) {
        doc.text(`Teléfono: ${clientInfo.telefono}`, margin, infoY);
        infoY += 5;
      }
    }

    // Project info
    if (projectInfo) {
      doc.setFont('helvetica', 'bold');
      doc.text('Proyecto:', margin, infoY);
      doc.setFont('helvetica', 'normal');
      doc.text(projectInfo.project_name || 'No especificado', margin + 20, infoY);
      infoY += 5;

      if (projectInfo.project_location) {
        doc.text(`Ubicación: ${projectInfo.project_location}`, margin, infoY);
        infoY += 5;
      }
    }

    // Separator line
    infoY += 5;
    doc.setDrawColor(51, 126, 198);
    doc.setLineWidth(0.5);
    doc.line(margin, infoY, pageWidth - margin, infoY);
    infoY += 10;

    // Table setup - removed Departamento column
    const colWidths = [50, 55, 30, 35, 35]; // Adjusted widths without departamento
    const headers = ['Mayor', 'Partida', 'Cantidad', 'P. Unitario', 'Monto Total'];
    const rowHeight = 8;
    let currentY = infoY;

    // Function to draw table headers - matching Gantt PDF colors
    const drawTableHeaders = (y: number) => {
      // Header background - matching Gantt PDF primary color
      doc.setFillColor(30, 58, 138); // #1E3A8A - Primary blue matching Gantt
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      
      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      let x = margin;
      headers.forEach((header, index) => {
        const textX = x + (colWidths[index] / 2);
        doc.text(header, textX, y + 5.5, { align: 'center' });
        x += colWidths[index];
      });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      return y + rowHeight;
    };

    // Draw initial table headers
    currentY = drawTableHeaders(currentY);

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    const allItems = presupuestos.map(item => ({
      mayor_nombre: item.mayor ? item.mayor.nombre : 'N/A',
      partida_nombre: item.partida ? item.partida.nombre : 'N/A',
      cantidad_requerida: item.cantidad_requerida,
      precio_unitario: item.precio_unitario,
      monto_total: item.monto_total
    }));

    allItems.forEach((item, index) => {
      // Check if we need a new page (leave space for totals)
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentPage++;
        drawHeader();
        drawFooter(currentPage, totalPages);
        currentY = 35; // Start position on new page
        currentY = drawTableHeaders(currentY);
      }

      // Alternating row colors
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // Light gray for alternating rows
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      // Row data - removed departamento column, only show names without codes
      let x = margin;
      const rowData = [
        item.mayor_nombre,
        item.partida_nombre,
        item.cantidad_requerida.toString(),
        `$${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${item.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ];

      rowData.forEach((data, colIndex) => {
        const cellWidth = colWidths[colIndex];
        const textX = colIndex >= 2 ? x + cellWidth - 2 : x + 2; // Right align for numeric columns (adjusted for removed departamento)
        const align = colIndex >= 2 ? 'right' : 'left';
        
        // Truncate text if too long
        let displayText = data;
        if (data.length > (cellWidth / 2.5)) {
          displayText = data.substring(0, Math.floor(cellWidth / 2.5)) + '...';
        }
        
        doc.text(displayText, textX, currentY + 5.5, { align });
        x += cellWidth;
      });

      currentY += rowHeight;
    });

    // Totals section - matching Gantt PDF style
    currentY += 10;
    
    // Total background - matching Gantt PDF
    doc.setFillColor(30, 58, 138); // #1E3A8A - Primary blue matching Gantt
    doc.rect(margin, currentY, contentWidth, rowHeight + 2, 'F');
    
    // Total text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PRESUPUESTO:', margin + 5, currentY + 7);
    doc.text(
      `$${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      currentY + 7,
      { align: 'right' }
    );

    // Reset text color
    doc.setTextColor(31, 41, 55); // #1F2937 - Dark text matching Gantt

    // Save PDF with descriptive filename
    const filename = `Presupuesto_Parametrico_${clientInfo?.nombre || 'Cliente'}_${projectInfo?.project_name || 'Proyecto'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
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