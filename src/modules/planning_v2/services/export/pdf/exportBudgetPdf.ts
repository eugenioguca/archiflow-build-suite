/**
 * PDF Export Service for Planning v2
 * Uses jsPDF and jspdf-autotable for professional letter-sized PDF exports
 */
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { getBranding, type CompanyBranding } from '../../../adapters/branding';
import { formatAsCurrency } from '../../../utils/monetary';

interface ExportPdfOptions {
  projectName: string;
  clientName?: string;
  folio?: string;
  generatedAt?: Date;
  groupedData: any[]; // GroupedData from planningExportService
  grandTotal: number;
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').trim();
}

/**
 * Convert hex color to RGB array
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [31, 64, 175]; // Default blue
}

/**
 * Load image as base64 data URL
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

/**
 * Add header with branding to each page
 */
async function addHeader(
  doc: jsPDF,
  branding: CompanyBranding,
  options: ExportPdfOptions,
  logoDataUrl: string | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = hexToRgb(branding.primary_color);

  // Blue header band
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 64, 'F');

  // Logo on the left
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 40, 12, 80, 40);
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  // Title and info on the right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PRESUPUESTO PARAMÉTRICO', pageWidth - 56, 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let yPos = 42;
  doc.text(branding.phone || '', pageWidth - 56, yPos, { align: 'right' });
  yPos += 10;
  doc.text(`Email: ${branding.email || ''}`, pageWidth - 56, yPos, { align: 'right' });
  yPos += 10;
  doc.text(branding.address || '', pageWidth - 56, yPos, { align: 'right' });

  // Project info below header band
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const date = options.generatedAt || new Date();
  const formattedDate = date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  
  doc.text(`Fecha de generación: ${formattedDate}`, 56, 88);
}

/**
 * Add footer with pagination
 */
function addFooters(doc: jsPDF, branding: CompanyBranding) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(230, 230, 230);
    doc.line(56, pageHeight - 60, pageWidth - 56, pageHeight - 60);

    // Page number and confidential text
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.text(`Página ${i} de ${pageCount}`, 56, pageHeight - 36);
    doc.text(
      `${branding.company_name} • Confidencial`,
      pageWidth - 56,
      pageHeight - 36,
      { align: 'right' }
    );
  }
}

/**
 * Convert grouped data to table rows
 */
function buildTableRows(groupedData: any[]): RowInput[] {
  const rows: RowInput[] = [];

  for (const mayorGroup of groupedData) {
    // Mayor header
    rows.push([
      {
        content: `${mayorGroup.mayorCodigo} - ${mayorGroup.mayorNombre}`,
        colSpan: 6,
        styles: {
          fontStyle: 'bold',
          fillColor: [224, 224, 224],
          fontSize: 11,
        },
      },
    ]);

    for (const { partida, subpartidas, ungroupedConceptos, total } of mayorGroup.partidas) {
      // Partida header
      rows.push([
        {
          content: `  ${partida.name}`,
          colSpan: 6,
          styles: {
            fontStyle: 'bold',
            fillColor: [240, 240, 240],
            fontSize: 10,
          },
        },
      ]);

      // Subpartidas
      for (const { wbsCode, conceptos, subtotal } of subpartidas) {
        // Subpartida header
        rows.push([
          {
            content: `    ${wbsCode}`,
            colSpan: 6,
            styles: {
              fontStyle: 'italic',
              fillColor: [248, 248, 248],
              fontSize: 9,
            },
          },
        ]);

        // Conceptos in this subpartida
        for (const concepto of conceptos) {
          rows.push([
            concepto.code || '',
            concepto.short_description || '',
            concepto.unit || '',
            (concepto.cantidad || 0).toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            formatAsCurrency(concepto.pu || 0),
            formatAsCurrency(concepto.total || 0),
          ]);
        }

        // Subpartida subtotal
        if (subtotal > 0) {
          rows.push([
            {
              content: 'Subtotal',
              colSpan: 5,
              styles: { fontStyle: 'bold', fillColor: [248, 248, 248] },
            },
            {
              content: formatAsCurrency(subtotal),
              styles: {
                fontStyle: 'bold',
                fillColor: [248, 248, 248],
                halign: 'right',
              },
            },
          ]);
        }
      }

      // Ungrouped conceptos
      for (const concepto of ungroupedConceptos) {
        rows.push([
          concepto.code || '',
          concepto.short_description || '',
          concepto.unit || '',
          (concepto.cantidad || 0).toLocaleString('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          formatAsCurrency(concepto.pu || 0),
          formatAsCurrency(concepto.total || 0),
        ]);
      }

      // Partida total
      rows.push([
        {
          content: `Total ${partida.name}`,
          colSpan: 5,
          styles: { fontStyle: 'bold', fillColor: [230, 230, 230] },
        },
        {
          content: formatAsCurrency(total),
          styles: {
            fontStyle: 'bold',
            fillColor: [230, 230, 230],
            halign: 'right',
          },
        },
      ]);
    }

    // Mayor total
    rows.push([
      {
        content: `TOTAL ${mayorGroup.mayorNombre}`,
        colSpan: 5,
        styles: {
          fontStyle: 'bold',
          fillColor: [200, 200, 200],
          fontSize: 11,
        },
      },
      {
        content: formatAsCurrency(mayorGroup.total),
        styles: {
          fontStyle: 'bold',
          fillColor: [200, 200, 200],
          halign: 'right',
          fontSize: 11,
        },
      },
    ]);

    // Empty row between mayors
    rows.push([{ content: '', colSpan: 6, styles: { fillColor: [255, 255, 255] } }]);
  }

  return rows;
}

/**
 * Main export function
 */
export async function exportBudgetPdf(options: ExportPdfOptions): Promise<void> {
  try {
    // Load branding
    const branding = await getBranding();

    // Load logo
    const logoDataUrl = branding.logo_url
      ? await loadImageAsDataUrl(branding.logo_url)
      : null;

    // Initialize PDF document (letter size)
    const doc = new jsPDF({
      unit: 'pt',
      format: 'letter',
      compress: true,
    });

    // Page margins
    const margin = { left: 56, right: 56, top: 120, bottom: 72 };

    // Add header
    await addHeader(doc, branding, options, logoDataUrl);

    // Prepare table data
    const headers = [
      ['Código', 'Concepto', 'Unidad', 'Cantidad', 'P. Unitario', 'Monto'],
    ];

    // Build body rows from grouped data
    const body: RowInput[] = buildTableRows(options.groupedData);

    // Add grand total row
    body.push([
      {
        content: 'TOTAL PRESUPUESTO',
        colSpan: 5,
        styles: {
          fontStyle: 'bold',
          fillColor: [51, 51, 51],
          textColor: [255, 255, 255],
          fontSize: 12,
        },
      },
      {
        content: formatAsCurrency(options.grandTotal),
        styles: {
          fontStyle: 'bold',
          fillColor: [51, 51, 51],
          textColor: [255, 255, 255],
          halign: 'right',
          fontSize: 12,
        },
      },
    ]);

    // Generate table with autoTable
    const primaryColor = hexToRgb(branding.primary_color);
    
    autoTable(doc, {
      head: headers,
      body,
      startY: margin.top,
      margin,
      pageBreak: 'auto',
      rowPageBreak: 'avoid', // Don't split rows across pages
      styles: {
        font: 'helvetica',
        fontSize: 10,
        overflow: 'linebreak',
        cellPadding: 6,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        halign: 'left',
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252],
      },
      columnStyles: {
        3: { halign: 'right' }, // Cantidad
        4: { halign: 'right' }, // P. Unitario
        5: { halign: 'right' }, // Monto
      },
      didDrawPage: (data) => {
        // This is called for each page - we don't redraw header here
        // because it would create duplicates
      },
    });

    // Add footers to all pages
    addFooters(doc, branding);

    // Generate filename and download
    const filename = `Presupuesto — ${sanitizeFilename(options.projectName)}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Error al generar el PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}
