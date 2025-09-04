import React from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { GanttBar, MonthlyCalculations } from '@/hooks/useInteractiveGantt';
import { supabase } from '@/integrations/supabase/client';
import { formatMonth } from '@/utils/cronogramaWeekUtils';

interface GanttPDFExportProps {
  ganttBars: GanttBar[];
  mayores: Array<{ id: string; codigo: string; nombre: string }>;
  calculations: MonthlyCalculations;
  manualOverrides: Record<string, { valor: string; hasOverride: boolean }>;
  clienteId: string;
  proyectoId: string;
  months?: number;
  className?: string;
}

export const GanttPDFExport: React.FC<GanttPDFExportProps> = ({
  ganttBars,
  mayores,
  calculations,
  manualOverrides,
  clienteId,
  proyectoId,
  months = 12,
  className
}) => {
  const exportToPDF = async () => {
    try {
      // Get client and project information
      const [clientResult, projectResult] = await Promise.all([
        supabase
          .from('clients')
          .select('full_name, email, phone')
          .eq('id', clienteId)
          .single(),
        supabase
          .from('client_projects')
          .select('project_name, project_location, construction_start_date')
          .eq('id', proyectoId)
          .single()
      ]);

      const client = clientResult.data;
      const project = projectResult.data;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      });

      // Brand colors (from design system)
      const primaryColor = [33, 150, 243]; // #2196F3 equivalent
      const secondaryColor = [255, 152, 0]; // #FF9800 equivalent
      const accentColor = [76, 175, 80]; // #4CAF50 equivalent

      let currentY = 20;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Helper function to add new page with header
      const addPageWithHeader = () => {
        doc.addPage();
        currentY = 20;
        addHeader();
      };

      // Header function
      const addHeader = () => {
        // Header background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, 10, pageWidth - 20, 30, 'F');

        // Company info (left side)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('DOVITA CONSTRUCCIONES', 15, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Av. Principal #123, Colonia Centro', 15, 30);
        doc.text('Tel: (555) 123-4567 | Email: info@dovita.mx', 15, 35);

        // Title (right side)
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CRONOGRAMA DE GANTT', pageWidth - 15, 25, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - 15, 32, { align: 'right' });

        currentY = 50;
      };

      // Add initial header
      addHeader();

      // Client and project information
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DEL PROYECTO', 15, currentY);
      
      currentY += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (client) {
        doc.text(`Cliente: ${client.full_name}`, 15, currentY);
        currentY += 5;
        if (client.email) {
          doc.text(`Email: ${client.email}`, 15, currentY);
          currentY += 5;
        }
        if (client.phone) {
          doc.text(`Teléfono: ${client.phone}`, 15, currentY);
          currentY += 5;
        }
      }

      if (project) {
        doc.text(`Proyecto: ${project.project_name}`, 15, currentY);
        currentY += 5;
        if (project.project_location) {
          doc.text(`Ubicación: ${project.project_location}`, 15, currentY);
          currentY += 5;
        }
        if (project.construction_start_date) {
          doc.text(`Inicio de Construcción: ${new Date(project.construction_start_date).toLocaleDateString('es-MX')}`, 15, currentY);
          currentY += 5;
        }
      }

      currentY += 10;

      // Gantt Chart
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CRONOGRAMA VISUAL', 15, currentY);
      currentY += 10;

      // Month headers - use formatMonth for consistent naming
      const monthHeaders = Array.from({ length: months }, (_, i) => {
        return formatMonth(i + 1);
      });

      const cellWidth = Math.min(20, (pageWidth - 80) / months);
      const rowHeight = 8;
      
      // Header row
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, 60, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('MAYOR', 17, currentY + 5);

      monthHeaders.forEach((month, idx) => {
        const x = 75 + (idx * cellWidth);
        doc.rect(x, currentY, cellWidth, rowHeight, 'F');
        doc.text(month, x + 2, currentY + 5);
      });

      currentY += rowHeight;

      // Gantt rows
      doc.setTextColor(0, 0, 0);
      mayores.forEach((mayor, mayorIdx) => {
        if (currentY > pageHeight - 30) {
          addPageWithHeader();
          currentY += 20; // Space for repeated headers
        }

        // Mayor name
        const fillColor = mayorIdx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(15, currentY, 60, rowHeight, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mayor.codigo}`, 17, currentY + 3);
        doc.text(`${mayor.nombre.substring(0, 25)}...`, 17, currentY + 6);

        // Month cells
        monthHeaders.forEach((month, monthIdx) => {
          const x = 75 + (monthIdx * cellWidth);
          doc.rect(x, currentY, cellWidth, rowHeight, 'S');
        });

        // Draw bars for this mayor using month+week positioning
        const mayorBars = ganttBars.filter(bar => bar.mayor_id === mayor.id);
        mayorBars.forEach(bar => {
          // Calculate position based on month and week (matching InteractiveGanttChart)
          const weekWidth = cellWidth / 4; // Each month cell contains 4 weeks
          const startPosition = ((bar.start_month - 1) * 4 + (bar.start_week - 1)) * weekWidth;
          const barWidth = Math.max(weekWidth, bar.duration_weeks * weekWidth); // Ensure minimum width
          const startX = 75 + startPosition;
          
          // Draw bar with rounded corners and better styling
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.roundedRect(startX, currentY + 2, barWidth, rowHeight - 4, 1, 1, 'F');
          
          // Add subtle border
          doc.setDrawColor(primaryColor[0] * 0.8, primaryColor[1] * 0.8, primaryColor[2] * 0.8);
          doc.setLineWidth(0.5);
          doc.roundedRect(startX, currentY + 2, barWidth, rowHeight - 4, 1, 1, 'S');
          
          // Bar text with better positioning
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          const text = `${bar.duration_weeks}w`;
          const textWidth = doc.getTextWidth(text);
          if (barWidth > textWidth + 4) { // Only show text if there's enough space
            const textX = startX + (barWidth - textWidth) / 2;
            doc.text(text, textX, currentY + 5);
          }
          doc.setTextColor(0, 0, 0);
        });

        currentY += rowHeight;
      });

      // Add new page for matrix if needed
      if (currentY > pageHeight - 100) {
        addPageWithHeader();
        currentY += 20;
      }

      // Monthly Numeric Matrix
      currentY += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('MATRIZ NUMÉRICA MENSUAL', 15, currentY);
      currentY += 10;

      // Matrix headers
      const matrixCellWidth = Math.min(18, (pageWidth - 80) / (months + 1));
      
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, 60, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('CONCEPTO', 17, currentY + 5);

      monthHeaders.forEach((month, idx) => {
        const x = 75 + (idx * matrixCellWidth);
        doc.rect(x, currentY, matrixCellWidth, rowHeight, 'F');
        doc.text(month.split(' ')[0], x + 1, currentY + 5);
      });

      // Total column
      const totalX = 75 + (months * matrixCellWidth);
      doc.rect(totalX, currentY, matrixCellWidth, rowHeight, 'F');
      doc.text('TOTAL', totalX + 1, currentY + 5);

      currentY += rowHeight;

      // Matrix rows
      const { gastoPorMes, avanceParcial, avanceAcumulado, ministraciones, inversionAcumulada } = calculations;
      
      const matrixRows = [
        { 
          label: 'GASTO EN OBRA (MXN)', 
          data: gastoPorMes, 
          format: 'currency',
          total: Object.values(gastoPorMes).reduce((sum, val) => sum + val, 0)
        },
        { 
          label: '% AVANCE PARCIAL', 
          data: avanceParcial, 
          format: 'percentage',
          total: 100
        },
        { 
          label: '% AVANCE ACUMULADO', 
          data: avanceAcumulado, 
          format: 'percentage',
          total: 100
        },
        { 
          label: 'MINISTRACIONES (MXN)', 
          data: ministraciones, 
          format: 'currency',
          total: Object.values(ministraciones).reduce((sum, val) => sum + val, 0)
        },
        { 
          label: '% INVERSIÓN ACUMULADA', 
          data: inversionAcumulada, 
          format: 'percentage',
          total: calculations.totalPresupuesto > 0 ? (Object.values(ministraciones).reduce((sum, val) => sum + val, 0) / calculations.totalPresupuesto) * 100 : 0
        }
      ];

      doc.setTextColor(0, 0, 0);
      matrixRows.forEach((row, rowIdx) => {
        if (currentY > pageHeight - 20) {
          addPageWithHeader();
          currentY += 20;
        }

        const fillColor = rowIdx % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        
        // Row label
        doc.rect(15, currentY, 60, rowHeight, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(row.label, 17, currentY + 5);

        // Data cells
        monthHeaders.forEach((month, monthIdx) => {
          const x = 75 + (monthIdx * matrixCellWidth);
          doc.rect(x, currentY, matrixCellWidth, rowHeight, 'S');
          
          const value = row.data[monthIdx + 1] || 0;
          let displayValue = '';
          
          if (row.format === 'currency') {
            displayValue = value > 0 ? `$${(value / 1000).toFixed(0)}K` : '-';
          } else if (row.format === 'percentage') {
            displayValue = value > 0 ? `${value.toFixed(1)}%` : '-';
          }
          
          // Check for manual overrides and add asterisk
          const overrideKey = `${monthIdx + 1}-${row.label.includes('GASTO') ? 'gasto_obra' : 
                                                  row.label.includes('PARCIAL') ? 'avance_parcial' :
                                                  row.label.includes('ACUMULADO') && row.label.includes('AVANCE') ? 'avance_acumulado' :
                                                  row.label.includes('MINISTRACIONES') ? 'ministraciones' :
                                                  row.label.includes('INVERSIÓN') ? 'inversion_acumulada' : ''}`;
          
          const hasOverride = manualOverrides[overrideKey]?.hasOverride;
          const displayText = hasOverride ? `${displayValue}*` : displayValue;
          
          doc.text(displayText, x + matrixCellWidth - 2, currentY + 5, { align: 'right' });
        });

        // Total cell
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2], 0.1);
        doc.rect(totalX, currentY, matrixCellWidth, rowHeight, 'F');
        
        let totalDisplay = '';
        if (row.format === 'currency') {
          totalDisplay = `$${(row.total / 1000).toFixed(0)}K`;
        } else if (row.format === 'percentage') {
          totalDisplay = `${row.total.toFixed(1)}%`;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(totalDisplay, totalX + matrixCellWidth - 2, currentY + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        currentY += rowHeight;
      });

      // Add footnote for manual overrides
      const hasAnyOverrides = Object.values(manualOverrides).some(override => override.hasOverride);
      if (hasAnyOverrides) {
        currentY += 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('* Valores editados manualmente por el usuario', 15, currentY);
      }

      // Footer
      const addFooter = (pageNum: number, totalPages: number) => {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, pageHeight - 20, pageWidth - 20, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('DOVITA - Sistema de Gestión de Proyectos', 15, pageHeight - 14);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 15, pageHeight - 14, { align: 'right' });
      };

      // Add footers to all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      // Save the PDF
      doc.save(`Cronograma_Gantt_${client?.full_name || 'Proyecto'}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <Button onClick={exportToPDF} variant="outline" className={className}>
      <Download className="h-4 w-4 mr-2" />
      Exportar PDF
    </Button>
  );
};