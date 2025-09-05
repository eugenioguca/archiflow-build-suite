import React from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { supabase } from '@/integrations/supabase/client';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { formatCurrency } from '@/utils/gantt-v2/currency';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';
import { useToast } from '@/hooks/use-toast';

interface GanttV2PDFExportProps {
  plan: GanttPlan;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  clientId: string;
  projectId: string;
  className?: string;
}

export function GanttV2PDFExport({
  plan,
  lines,
  mayores,
  overrides,
  clientId,
  projectId,
  className
}: GanttV2PDFExportProps) {
  const { toast } = useToast();

  const exportToPDF = async () => {
    try {
      // Get client and project information (no company settings for now)
      const [clientResult, projectResult] = await Promise.all([
        supabase.from('clients').select('full_name, email, phone').eq('id', clientId).single(),
        supabase.from('client_projects').select('project_name, project_location, construction_start_date').eq('id', projectId).single()
      ]);

      // Use default company data for now
      const company = {
        company_name: 'DOVITA CONSTRUCCIONES',
        address: 'Dirección de la empresa',
        phone: '(555) 123-4567',
        email: 'info@dovita.com',
        website: 'www.dovita.com'
      };
      
      const client = clientResult.data;
      const project = projectResult.data;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      // Design system colors (matching platform)
      const primaryColor = [33, 150, 243]; // Primary blue
      const accentColor = [255, 152, 0]; // Orange accent  
      const textColor = [51, 51, 51]; // Dark gray
      const lightGray = [248, 248, 248];

      let currentY = 20;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const monthRange = generateMonthRange(plan.start_month, plan.months_count);

      // Calculate totals
      const mayorLines = lines.filter(line => !line.is_discount);
      const totalSubtotal = mayorLines.reduce((sum, line) => sum + line.amount, 0);
      const discountLines = lines.filter(line => line.is_discount);
      const totalDiscount = discountLines.reduce((sum, line) => sum + line.amount, 0);
      const total = totalSubtotal + totalDiscount;

      // Helper function to add new page with header
      const addPageWithHeader = () => {
        doc.addPage();
        currentY = 20;
        addHeader();
      };

      // Header function with company branding
      const addHeader = () => {
        // Header background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, 10, pageWidth - 20, 40, 'F');

        // Company logo area (left side)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        const companyName = company?.company_name || 'DOVITA CONSTRUCCIONES';
        doc.text(companyName.toUpperCase(), 15, 28);
        
        // Contact info
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const contactInfo = [
          company?.website || 'www.dovita.mx',
          company?.email || 'info@dovita.mx',
          company?.phone || '(555) 123-4567'
        ].join(' | ');
        doc.text(contactInfo, 15, 42);

        // Document title (center-right)
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CRONOGRAMA DE GANTT V2', pageWidth - 15, 25, { align: 'right' });
        
        // Date and version
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`, pageWidth - 15, 32, { align: 'right' });
        
        doc.text('Sistema de Gestión Dovita v2.0', pageWidth - 15, 39, { align: 'right' });

        // Company address
        if (company?.address) {
          doc.setFontSize(8);
          doc.text(company.address, 15, 47);
        }

        currentY = 60;
      };

      // Add initial header
      addHeader();

      // Client and project information section
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(15, currentY, pageWidth - 30, 25, 'F');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DEL PROYECTO', 20, currentY + 8);
      
      currentY += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (client && project) {
        const leftColumn = [
          `Cliente: ${client.full_name}`,
          `Email: ${client.email || 'N/A'}`,
          `Teléfono: ${client.phone || 'N/A'}`
        ];
        
        const rightColumn = [
          `Proyecto: ${project.project_name}`,
          `Ubicación: ${project.project_location || 'N/A'}`,
          `Inicio: ${project.construction_start_date ? 
            new Date(project.construction_start_date).toLocaleDateString('es-MX') : 'Por definir'}`
        ];
        
        leftColumn.forEach((text, idx) => {
          doc.text(text, 20, currentY + (idx * 5));
        });
        
        rightColumn.forEach((text, idx) => {
          doc.text(text, pageWidth / 2 + 10, currentY + (idx * 5));
        });
      }

      currentY += 25;

      // Summary section
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2], 0.1);
      doc.rect(15, currentY, pageWidth - 30, 20, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN FINANCIERO', 20, currentY + 8);
      
      currentY += 12;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryItems = [
        `Subtotal: ${formatCurrency(totalSubtotal)}`,
        `Descuentos: ${formatCurrency(totalDiscount)}`,
        `Total: ${formatCurrency(total)}`,
        `Período: ${monthRange.length} meses`
      ];
      
      summaryItems.forEach((item, idx) => {
        const x = 20 + (idx * (pageWidth - 40) / 4);
        doc.text(item, x, currentY + 5);
      });

      currentY += 15;

      // Table of Lines (Mayor data)
      if (lines.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TABLA DE PARTIDAS', 15, currentY);
        currentY += 10;

        // Table headers
        const colWidths = [20, 30, 80, 40, 30, 30]; // No., Código, Mayor, Importe, %, Tipo
        let startX = 15;

        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        const headers = ['No.', 'Código', 'Mayor', 'Importe', '%', 'Tipo'];
        headers.forEach((header, idx) => {
          doc.rect(startX, currentY, colWidths[idx], 8, 'F');
          doc.text(header, startX + 2, currentY + 5);
          startX += colWidths[idx];
        });

        currentY += 8;
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        // Table rows
        lines.forEach((line, idx) => {
          if (currentY > pageHeight - 40) {
            addPageWithHeader();
            currentY += 20;
          }

          startX = 15;
          const mayor = mayores.find(m => m.id === line.mayor_id);
          const percentage = totalSubtotal > 0 ? ((line.amount / totalSubtotal) * 100) : 0;
          
          const fillColor = idx % 2 === 0 ? [255, 255, 255] : lightGray;
          doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
          
          const rowData = [
            (idx + 1).toString(),
            mayor?.codigo || 'N/A',
            mayor?.nombre || 'Mayor no encontrado',
            formatCurrency(line.amount),
            `${percentage.toFixed(2)}%`,
            line.is_discount ? 'Descuento' : 'Mayor'
          ];

          rowData.forEach((data, colIdx) => {
            doc.rect(startX, currentY, colWidths[colIdx], 6, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            // Truncate text if too long
            let displayText = data;
            if (colIdx === 2 && data.length > 35) { // Mayor name
              displayText = data.substring(0, 32) + '...';
            }
            
            doc.text(displayText, startX + 1, currentY + 4);
            startX += colWidths[colIdx];
          });

          currentY += 6;
        });

        currentY += 10;
      }

      // Visual Gantt Chart Section
      if (currentY > pageHeight - 100) {
        addPageWithHeader();
        currentY += 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CRONOGRAMA VISUAL', 15, currentY);
      currentY += 10;

      // Calculate grid dimensions for Gantt
      const mayorColumnWidth = 70;
      const availableWidth = pageWidth - mayorColumnWidth - 30;
      const cellWidth = Math.min(20, availableWidth / plan.months_count);
      const rowHeight = 10;
      
      // Draw Gantt headers
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, mayorColumnWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PARTIDA / MAYOR', 17, currentY + 6);

      // Month headers
      monthRange.forEach((month, idx) => {
        const x = 15 + mayorColumnWidth + (idx * cellWidth);
        doc.rect(x, currentY, cellWidth, rowHeight, 'F');
        const monthLabel = new Date(parseInt(month.value.substring(0, 4)), parseInt(month.value.substring(4, 6)) - 1)
          .toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
        doc.setFontSize(7);
        doc.text(monthLabel, x + 1, currentY + 6);
      });

      currentY += rowHeight;

      // Draw gantt rows with activities
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      mayorLines.forEach((line, lineIdx) => {
        if (currentY > pageHeight - 40) {
          addPageWithHeader();
          currentY += 20;
        }

        const mayor = mayores.find(m => m.id === line.mayor_id);
        
        // Mayor row background
        const fillColor = lineIdx % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(15, currentY, mayorColumnWidth, rowHeight, 'F');
        
        // Mayor info
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mayor?.codigo || 'N/A'}`, 17, currentY + 4);
        const mayorName = mayor?.nombre || 'Mayor no encontrado';
        doc.text(mayorName.length > 30 ? `${mayorName.substring(0, 27)}...` : mayorName, 17, currentY + 8);

        // Month cells with borders
        monthRange.forEach((month, monthIdx) => {
          const x = 15 + mayorColumnWidth + (monthIdx * cellWidth);
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, currentY, cellWidth, rowHeight, 'S');
        });

        // Draw activity bars for this line using week-based cells
        if (line.activities && line.activities.length > 0) {
          line.activities.forEach(activity => {
            // Use expandRangeToMonthWeekCells to get exact cells to paint
            const cells = expandRangeToMonthWeekCells(
              activity.start_month,
              activity.start_week,
              activity.end_month,
              activity.end_week
            );
            
            // Paint each cell that this activity covers
            cells.forEach(cell => {
              const monthIndex = monthRange.findIndex(m => m.value === cell.month);
              if (monthIndex !== -1) {
                // Calculate position for this specific week within the month
                const weekCellWidth = cellWidth / 4; // Divide month into 4 weeks
                const weekOffset = (cell.week - 1) * weekCellWidth;
                const startX = 15 + mayorColumnWidth + monthIndex * cellWidth + weekOffset;
                
                // Activity bar for this week (blue bars)
                doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.roundedRect(startX + 1, currentY + 2, weekCellWidth - 2, rowHeight - 4, 1, 1, 'F');
              }
            });
          });
        }

        currentY += rowHeight;
      });

      // Add space before matrix
      if (currentY > pageHeight - 120) {
        addPageWithHeader();
        currentY += 20;
      } else {
        currentY += 15;
      }

      // Monthly Numeric Matrix Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MATRIZ NUMÉRICA MENSUAL', 15, currentY);
      currentY += 10;

      // Calculate matrix data
      const gastoEnObra: Record<string, number> = {};
      
      monthRange.forEach(month => {
        let monthTotal = 0;
        
        mayorLines.forEach(line => {
          if (!line.activities || line.activities.length === 0) return;
          
          let activeWeeksInMonth = 0;
          line.activities.forEach(activity => {
            const cells = expandRangeToMonthWeekCells(
              activity.start_month,
              activity.start_week,
              activity.end_month,
              activity.end_week
            );
            
            activeWeeksInMonth += cells.filter(cell => cell.month === month.value).length;
          });
          
          let totalActiveWeeks = 0;
          line.activities.forEach(activity => {
            const cells = expandRangeToMonthWeekCells(
              activity.start_month,
              activity.start_week,
              activity.end_month,
              activity.end_week
            );
            totalActiveWeeks += cells.length;
          });
          
          if (totalActiveWeeks > 0) {
            const proportionalAmount = (line.amount * activeWeeksInMonth) / totalActiveWeeks;
            monthTotal += proportionalAmount;
          }
        });
        
        gastoEnObra[month.value] = monthTotal;
      });

      // Calculate cumulative percentages
      const avanceAcumulado: Record<string, number> = {};
      let cumulativeSpending = 0;
      
      monthRange.forEach(month => {
        cumulativeSpending += gastoEnObra[month.value] || 0;
        avanceAcumulado[month.value] = totalSubtotal > 0 ? (cumulativeSpending / totalSubtotal) * 100 : 0;
      });

      const avanceParcial: Record<string, number> = {};
      monthRange.forEach(month => {
        const monthSpending = gastoEnObra[month.value] || 0;
        avanceParcial[month.value] = totalSubtotal > 0 ? (monthSpending / totalSubtotal) * 100 : 0;
      });

      // Matrix headers
      const matrixCellWidth = Math.min(22, (pageWidth - 100) / (plan.months_count + 1));
      
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, 80, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CONCEPTO', 17, currentY + 6);

      monthRange.forEach((month, idx) => {
        const x = 95 + (idx * matrixCellWidth);
        doc.rect(x, currentY, matrixCellWidth, rowHeight, 'F');
        const monthLabel = new Date(parseInt(month.value.substring(0, 4)), parseInt(month.value.substring(4, 6)) - 1)
          .toLocaleDateString('es-MX', { month: 'short' });
        doc.setFontSize(7);
        doc.text(monthLabel, x + 1, currentY + 6);
      });

      // Total column
      const totalX = 95 + (plan.months_count * matrixCellWidth);
      doc.rect(totalX, currentY, matrixCellWidth, rowHeight, 'F');
      doc.text('TOTAL', totalX + 2, currentY + 6);

      currentY += rowHeight;

      // Matrix data rows
      const matrixRows = [
        { 
          label: 'Gasto en Obra', 
          data: gastoEnObra, 
          format: 'currency',
          total: Object.values(gastoEnObra).reduce((sum, val) => sum + val, 0)
        },
        { 
          label: '% Avance Parcial', 
          data: avanceParcial, 
          format: 'percentage',
          total: Object.values(avanceParcial).reduce((sum, val) => sum + val, 0)
        },
        { 
          label: '% Avance Acumulado', 
          data: avanceAcumulado, 
          format: 'percentage',
          total: Math.max(...Object.values(avanceAcumulado))
        },
        { 
          label: 'Ministraciones', 
          data: {}, 
          format: 'currency',
          total: 0
        },
        { 
          label: '% Inversión Acum.', 
          data: {}, 
          format: 'percentage',
          total: 0
        }
      ];

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      matrixRows.forEach((row, rowIdx) => {
        if (currentY > pageHeight - 20) {
          addPageWithHeader();
          currentY += 20;
        }

        const fillColor = rowIdx % 2 === 0 ? lightGray : [255, 255, 255];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        
        // Row label
        doc.rect(15, currentY, 80, rowHeight, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(row.label, 17, currentY + 6);

        // Data cells
        monthRange.forEach((month, monthIdx) => {
          const x = 95 + (monthIdx * matrixCellWidth);
          doc.rect(x, currentY, matrixCellWidth, rowHeight, 'S');
          
          const value = row.data[month.value] || 0;
          let displayValue = '';
          
          if (row.format === 'currency') {
            displayValue = value > 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`;
          } else if (row.format === 'percentage') {
            displayValue = `${value.toFixed(1)}%`;
          }
          
          doc.setFontSize(7);
          doc.text(displayValue, x + matrixCellWidth - 2, currentY + 6, { align: 'right' });
        });

        // Total cell
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2], 0.2);
        doc.rect(totalX, currentY, matrixCellWidth, rowHeight, 'F');
        
        let totalDisplay = '';
        if (row.format === 'currency') {
          totalDisplay = row.total > 1000 ? `$${(row.total / 1000).toFixed(0)}K` : `$${row.total.toFixed(0)}`;
        } else if (row.format === 'percentage') {
          totalDisplay = `${row.total.toFixed(1)}%`;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(totalDisplay, totalX + matrixCellWidth - 2, currentY + 6, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        currentY += rowHeight;
      });

      // Add footnotes
      currentY += 10;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('Las barras azules en el cronograma representan las semanas de ejecución de cada partida.', 15, currentY);
      
      if (overrides.length > 0) {
        currentY += 5;
        doc.text('* Algunos valores han sido editados manualmente por el usuario.', 15, currentY);
      }

      // Add footer to all pages
      const addFooter = (pageNum: number, totalPages: number) => {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, pageHeight - 20, pageWidth - 20, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const footerCompany = company.company_name || 'DOVITA CONSTRUCCIONES';
        doc.text(`${footerCompany} - Sistema de Gestión de Proyectos`, 15, pageHeight - 14);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 15, pageHeight - 14, { align: 'right' });
        doc.text(`Confidencial - Solo para uso interno`, pageWidth / 2, pageHeight - 14, { align: 'center' });
      };

      // Apply footers
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      // Generate filename
      const clientName = client?.full_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Cliente';
      const projectName = project?.project_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Proyecto';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Cronograma_Gantt_v2_${clientName}_${projectName}_${date}.pdf`;

      // Save the PDF
      doc.save(filename);

      toast({
        title: "PDF Generado",
        description: `El cronograma se ha exportado como ${filename}`
      });

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error al exportar",
        description: error.message || 'Error al generar el PDF',
        variant: "destructive"
      });
    }
  };

  return (
    <Button onClick={exportToPDF} variant="outline" size="sm" className={`gap-2 ${className}`}>
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}