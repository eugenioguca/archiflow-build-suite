/**
 * PDF Export Service for Planning v2 - Dovita Style
 * Uses jsPDF and jspdf-autotable for professional letter-sized PDF exports
 * Brand colors: PRIMARY #28135f (blue), ACCENT #f0a33a (orange)
 */
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { getBranding, type CompanyBranding } from '../../../adapters/branding';
import { formatAsCurrency } from '../../../utils/monetary';

// Dovita brand colors
const BRAND_PRIMARY = '#28135f'; // Blue
const BRAND_ACCENT = '#f0a33a'; // Orange

interface ExportPdfOptions {
  projectName: string;
  clientName?: string;
  folio?: string;
  generatedAt?: Date;
  location?: string;
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
    : [40, 19, 95]; // Default to brand primary
}

/**
 * Robust logo loader: handles SVG conversion, CORS, base64
 */
async function getBrandingLogoDataUrl(branding: CompanyBranding): Promise<string | null> {
  try {
    // If already base64, use it directly
    if (branding.logo_url?.startsWith('data:')) {
      return branding.logo_url;
    }

    if (!branding.logo_url) return null;

    const url = branding.logo_url;

    // Try to fetch the image
    const response = await fetch(url, { mode: 'cors' }).catch(() => null);
    if (!response || !response.ok) return null;

    const blob = await response.blob();
    
    // If SVG, convert to PNG using canvas
    if (blob.type === 'image/svg+xml' || url.endsWith('.svg')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 400;
            canvas.height = img.height || 140;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }

    // For PNG/JPG, convert to data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Error loading logo:', error);
    return null;
  }
}

/**
 * Draw header with brand bar, logo, and company info
 */
function drawHeader(
  doc: jsPDF,
  pageW: number,
  margin: { left: number; right: number },
  branding: CompanyBranding,
  logoDataUrl: string | null
) {
  const headerH = 96;
  const [PR, PG, PB] = hexToRgb(BRAND_PRIMARY);

  // Header band
  doc.setFillColor(PR, PG, PB);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Logo on the left (centered vertically)
  if (logoDataUrl) {
    try {
      const maxH = 54;
      const logoY = (headerH - maxH) / 2;
      const logoW = 140;
      doc.addImage(logoDataUrl, 'PNG', margin.left, logoY, logoW, maxH, undefined, 'FAST');
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }

  // Right block: "PRESUPUESTO" + company info (centered vertically)
  const rightX = pageW - margin.right;
  const centerY = headerH / 2;

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PRESUPUESTO', rightX, centerY - 8, { align: 'right', baseline: 'middle' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const info = [
    branding.company_name || 'DOVITA CONSTRUCCIONES',
    [branding.phone, branding.email].filter(Boolean).join(' • '),
    branding.address || 'Querétaro, Qro.'
  ].filter(Boolean);

  const startY = centerY + 8;
  info.forEach((line, i) => doc.text(line, rightX, startY + i * 12, { align: 'right' }));

  // Separator line below header
  doc.setDrawColor(PR, PG, PB);
  doc.setLineWidth(1);
  doc.line(margin.left, headerH + 18, pageW - margin.right, headerH + 18);
}

/**
 * Draw project info section with title and orange line
 */
function drawProjectInfo(
  doc: jsPDF,
  pageW: number,
  margin: { left: number; right: number },
  options: ExportPdfOptions
): number {
  const headerH = 96;

  // Main title: "Presupuesto — {Proyecto}"
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Presupuesto — ${options.projectName}`, margin.left, headerH + 46);

  // Section title: "INFORMACIÓN DEL PROYECTO"
  doc.setFontSize(11);
  doc.text('INFORMACIÓN DEL PROYECTO', margin.left, headerH + 76);

  // Orange separator line
  const [AR, AG, AB] = hexToRgb(BRAND_ACCENT);
  doc.setDrawColor(AR, AG, AB);
  doc.setLineWidth(3);
  doc.line(margin.left, headerH + 82, pageW - margin.right, headerH + 82);

  // Project details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const date = options.generatedAt || new Date();
  const formattedDate = date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  let y = headerH + 102;
  doc.text(`Fecha de generación: ${formattedDate}`, margin.left, y);
  y += 14;
  doc.text(`Proyecto: ${options.projectName}`, margin.left, y);
  y += 14;
  if (options.clientName) {
    doc.text(`Cliente: ${options.clientName}`, margin.left, y);
    y += 14;
  }
  if (options.location) {
    doc.text(`Ubicación: ${options.location}`, margin.left, y);
    y += 14;
  }
  if (options.folio) {
    doc.text(`Folio: ${options.folio}`, margin.left, y);
    y += 14;
  }

  return y + 16; // Return startY for table
}

/**
 * Draw footer with orange line and pagination
 */
function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: { left: number; right: number; bottom: number },
  branding: CompanyBranding
) {
  const page = doc.getCurrentPageInfo().pageNumber;
  const totalPages = doc.getNumberOfPages();

  // Orange line
  const [AR, AG, AB] = hexToRgb(BRAND_ACCENT);
  doc.setDrawColor(AR, AG, AB);
  doc.setLineWidth(2);
  doc.line(margin.left, pageH - margin.bottom + 18, pageW - margin.right, pageH - margin.bottom + 18);

  // Pagination and confidential text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Página ${page} de ${totalPages}`, margin.left, pageH - 20);

  const brandName = branding.company_name || 'DOVITA CONSTRUCCIONES';
  doc.text(`${brandName} • Confidencial`, pageW - margin.right, pageH - 20, { align: 'right' });
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
          textColor: [51, 51, 51],
          fontSize: 10,
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
            textColor: [51, 51, 51],
            fontSize: 9,
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
              fontSize: 8.5,
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
              styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [51, 51, 51] },
            },
            {
              content: formatAsCurrency(subtotal),
              styles: {
                fontStyle: 'bold',
                fillColor: [230, 230, 230],
                textColor: [51, 51, 51],
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
          styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [51, 51, 51] },
        },
        {
          content: formatAsCurrency(total),
          styles: {
            fontStyle: 'bold',
            fillColor: [230, 230, 230],
            textColor: [51, 51, 51],
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
          textColor: [51, 51, 51],
          fontSize: 10,
        },
      },
      {
        content: formatAsCurrency(mayorGroup.total),
        styles: {
          fontStyle: 'bold',
          fillColor: [200, 200, 200],
          textColor: [51, 51, 51],
          halign: 'right',
          fontSize: 10,
        },
      },
    ]);

    // Empty row between mayors
    rows.push([{ content: '', colSpan: 6, styles: { fillColor: [255, 255, 255], minCellHeight: 8 } }]);
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

    // Load logo (robust, handles SVG/CORS/base64)
    const logoDataUrl = await getBrandingLogoDataUrl(branding);

    // Initialize PDF document (letter size)
    const doc = new jsPDF({
      unit: 'pt',
      format: 'letter',
      compress: true,
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Page margins
    const margin = { left: 56, right: 56, top: 120, bottom: 72 };

    // Draw initial header
    drawHeader(doc, pageW, margin, branding, logoDataUrl);

    // Draw project info and get startY for table
    const startY = drawProjectInfo(doc, pageW, margin, options);

    // Prepare table data
    const headers = [
      ['Código', 'Concepto', 'Unidad', 'Cantidad', 'P. Unitario', 'Monto'],
    ];

    // Build body rows from grouped data
    const body: RowInput[] = buildTableRows(options.groupedData);

    // Brand colors for table
    const [PR, PG, PB] = hexToRgb(BRAND_PRIMARY);

    // Generate table
    autoTable(doc, {
      head: headers,
      body,
      startY,
      margin,
      pageBreak: 'auto',
      rowPageBreak: 'avoid', // Don't split rows across pages
      styles: {
        font: 'helvetica',
        fontSize: 9,
        overflow: 'linebreak',
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [PR, PG, PB],
        textColor: [255, 255, 255],
        halign: 'left',
        fontStyle: 'bold',
        fontSize: 9.5,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252],
      },
      columnStyles: {
        3: { halign: 'right' }, // Cantidad
        4: { halign: 'right' }, // P. Unitario
        5: { halign: 'right' }, // Monto
      },
      didDrawPage: () => {
        // Redraw header and footer on each page
        drawHeader(doc, pageW, margin, branding, logoDataUrl);
        drawFooter(doc, pageW, pageH, margin, branding);
      },
    });

    // Add grand total bar
    let finalY = (doc as any).lastAutoTable.finalY || startY;

    // Check if we need a new page for the total
    if (finalY > pageH - margin.bottom - 40) {
      doc.addPage();
      drawHeader(doc, pageW, margin, branding, logoDataUrl);
      drawFooter(doc, pageW, pageH, margin, branding);
      finalY = margin.top;
    }

    // Draw total bar with brand color
    doc.setFillColor(PR, PG, PB);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin.left, finalY + 12, pageW - margin.left - margin.right, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL PRESUPUESTO', margin.left + 10, finalY + 31, { baseline: 'middle' });
    doc.text(
      formatAsCurrency(options.grandTotal),
      pageW - margin.right - 10,
      finalY + 31,
      { align: 'right', baseline: 'middle' }
    );

    // Draw footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawFooter(doc, pageW, pageH, margin, branding);
    }

    // Generate filename and download
    const filename = `Presupuesto — ${sanitizeFilename(options.projectName)}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Error al generar el PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}
