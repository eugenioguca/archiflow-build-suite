import React from 'react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ModernGanttActivity, MonthlyCalculations, MatrixOverride } from '@/hooks/useModernCronograma';
import { supabase } from '@/integrations/supabase/client';
import { formatMonth, generateMonthRange } from '@/utils/cronogramaWeekUtils';

interface ModernGanttPDFExportProps {
  activities: ModernGanttActivity[];
  mayores: Array<{ id: string; codigo: string; nombre: string }>;
  calculations: MonthlyCalculations;
  matrixOverrides: MatrixOverride[];
  clienteId: string;
  proyectoId: string;
  months?: number;
  className?: string;
}

export const ModernGanttPDFExport: React.FC<ModernGanttPDFExportProps> = ({
  activities,
  mayores,
  calculations,
  matrixOverrides,
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

      // Dovita brand colors
      const primaryColor = [33, 150, 243]; // Primary blue
      const accentColor = [255, 152, 0]; // Orange accent
      const textColor = [51, 51, 51]; // Dark gray

      let currentY = 20;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const monthRange = generateMonthRange(0, months);

      // Helper function to add new page with header
      const addPageWithHeader = () => {
        doc.addPage();
        currentY = 20;
        addHeader();
      };

      // Header function with Dovita branding
      const addHeader = () => {
        // Header background with gradient effect
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, 10, pageWidth - 20, 35, 'F');

        // Dovita logo area (left side)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('DOVITA', 15, 28);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('CONSTRUCCIONES', 15, 35);
        
        // Contact info
        doc.setFontSize(9);
        doc.text('www.dovita.mx | info@dovita.mx | (555) 123-4567', 15, 40);

        // Document title (center-right)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('CRONOGRAMA DE GANTT', pageWidth - 15, 25, { align: 'right' });
        
        // Date and version
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`, pageWidth - 15, 32, { align: 'right' });
        
        doc.text('Sistema de Gestión Dovita v2.0', pageWidth - 15, 38, { align: 'right' });

        currentY = 55;
      };

      // Add initial header
      addHeader();

      // Client and project information section
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFillColor(245, 245, 245);
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

      // Visual Gantt Chart Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CRONOGRAMA VISUAL', 15, currentY);
      currentY += 10;

      // Calculate grid dimensions
      const mayorColumnWidth = 60;
      const availableWidth = pageWidth - mayorColumnWidth - 30;
      const cellWidth = Math.min(15, availableWidth / months);
      const rowHeight = 8;
      
      // Draw grid headers
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, mayorColumnWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('PARTIDA', 17, currentY + 5);

      // Month headers
      monthRange.forEach((month, idx) => {
        const x = 15 + mayorColumnWidth + (idx * cellWidth);
        doc.rect(x, currentY, cellWidth, rowHeight, 'F');
        doc.text(formatMonth(month).substring(0, 3), x + 1, currentY + 5);
      });

      currentY += rowHeight;

      // Draw gantt rows with activities
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      mayores.forEach((mayor, mayorIdx) => {
        if (currentY > pageHeight - 40) {
          addPageWithHeader();
          currentY += 20;
        }

        // Mayor row background
        const fillColor = mayorIdx % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(15, currentY, mayorColumnWidth, rowHeight, 'F');
        
        // Mayor info
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${mayor.codigo}`, 17, currentY + 3);
        doc.text(`${mayor.nombre.substring(0, 30)}...`, 17, currentY + 6);

        // Month cells
        monthRange.forEach((month, monthIdx) => {
          const x = 15 + mayorColumnWidth + (monthIdx * cellWidth);
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, currentY, cellWidth, rowHeight, 'S');
        });

        // Draw activity bars for this mayor
        const mayorActivities = activities.filter(activity => activity.mayor_id === mayor.id);
        mayorActivities.forEach(activity => {
          // Find start and end positions
          const startMonthIndex = monthRange.indexOf(activity.start_month);
          const endMonthIndex = monthRange.indexOf(activity.end_month);
          
          if (startMonthIndex !== -1 && endMonthIndex !== -1) {
            const startX = 15 + mayorColumnWidth + startMonthIndex * cellWidth;
            const barWidth = Math.max(cellWidth * 0.8, (endMonthIndex - startMonthIndex + 1) * cellWidth * 0.8);
            
            // Activity bar
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.roundedRect(startX + 1, currentY + 1.5, barWidth, rowHeight - 3, 1, 1, 'F');
            
            // Duration text if there's space
            if (barWidth > 10) {
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(7);
              const durationText = `${activity.duration_weeks}s`;
              const textWidth = doc.getTextWidth(durationText);
              if (barWidth > textWidth + 2) {
                doc.text(durationText, startX + (barWidth - textWidth) / 2, currentY + 5);
              }
            }
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          }
        });

        currentY += rowHeight;
      });

      // Add space before matrix
      if (currentY > pageHeight - 80) {
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

      // Matrix headers
      const matrixCellWidth = Math.min(18, (pageWidth - 80) / (months + 1));
      
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, 60, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CONCEPTO', 17, currentY + 5);

      monthRange.forEach((month, idx) => {
        const x = 75 + (idx * matrixCellWidth);
        doc.rect(x, currentY, matrixCellWidth, rowHeight, 'F');
        doc.text(formatMonth(month).substring(0, 6), x + 1, currentY + 5);
      });

      // Total column
      const totalX = 75 + (months * matrixCellWidth);
      doc.rect(totalX, currentY, matrixCellWidth, rowHeight, 'F');
      doc.text('TOTAL', totalX + 2, currentY + 5);

      currentY += rowHeight;

      // Matrix data rows
      const matrixRows = [
        { 
          label: 'GASTO EN OBRA (MXN)', 
          data: calculations.gastoPorMes, 
          format: 'currency',
          total: Object.values(calculations.gastoPorMes).reduce((sum, val) => sum + val, 0)
        },
        { 
          label: '% AVANCE PARCIAL', 
          data: calculations.avanceParcial, 
          format: 'percentage',
          total: 100
        },
        { 
          label: '% AVANCE ACUMULADO', 
          data: calculations.avanceAcumulado, 
          format: 'percentage',
          total: Math.max(...Object.values(calculations.avanceAcumulado))
        },
        { 
          label: 'MINISTRACIONES (MXN)', 
          data: calculations.ministraciones, 
          format: 'currency',
          total: Object.values(calculations.ministraciones).reduce((sum, val) => sum + val, 0)
        },
        { 
          label: '% INVERSIÓN ACUMULADA', 
          data: calculations.inversionAcumulada, 
          format: 'percentage',
          total: Math.max(...Object.values(calculations.inversionAcumulada))
        }
      ];

      // Create override lookup for asterisk indicators
      const overrideLookup: Record<string, boolean> = {};
      matrixOverrides.forEach(override => {
        overrideLookup[`${override.mes}-${override.concepto}`] = true;
      });

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      matrixRows.forEach((row, rowIdx) => {
        if (currentY > pageHeight - 20) {
          addPageWithHeader();
          currentY += 20;
        }

        const fillColor = rowIdx % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        
        // Row label
        doc.rect(15, currentY, 60, rowHeight, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(row.label, 17, currentY + 5);

        // Data cells
        monthRange.forEach((month, monthIdx) => {
          const x = 75 + (monthIdx * matrixCellWidth);
          doc.rect(x, currentY, matrixCellWidth, rowHeight, 'S');
          
          const value = row.data[month] || 0;
          let displayValue = '';
          
          if (row.format === 'currency') {
            displayValue = value > 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`;
          } else if (row.format === 'percentage') {
            displayValue = `${value.toFixed(1)}%`;
          }
          
          // Check for override and add asterisk
          const conceptMap: Record<string, string> = {
            'GASTO EN OBRA (MXN)': 'gasto_obra',
            '% AVANCE PARCIAL': 'avance_parcial',
            '% AVANCE ACUMULADO': 'avance_acumulado',
            'MINISTRACIONES (MXN)': 'ministraciones',
            '% INVERSIÓN ACUMULADA': 'inversion_acumulada'
          };
          
          const conceptKey = conceptMap[row.label];
          const hasOverride = overrideLookup[`${month}-${conceptKey}`];
          
          const finalText = hasOverride ? `${displayValue}*` : displayValue;
          doc.text(finalText, x + matrixCellWidth - 2, currentY + 5, { align: 'right' });
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
        doc.text(totalDisplay, totalX + matrixCellWidth - 2, currentY + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        currentY += rowHeight;
      });

      // Add footnote for overrides if any exist
      if (matrixOverrides.length > 0) {
        currentY += 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('* Valores editados manualmente por el usuario', 15, currentY);
      }

      // Add footer to all pages
      const addFooter = (pageNum: number, totalPages: number) => {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, pageHeight - 20, pageWidth - 20, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('DOVITA - Sistema de Gestión de Proyectos', 15, pageHeight - 14);
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
      const filename = `Cronograma_${clientName}_${projectName}_${date}.pdf`;

      // Save the PDF
      doc.save(filename);

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