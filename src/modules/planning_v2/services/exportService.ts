/**
 * Servicio de exportación para Planning v2
 * Soporta PDF y Excel con columnas configurables
 */
import * as XLSX from 'xlsx';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../utils/monetary';

export interface ExportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage';
  visible: boolean;
}

export interface ExportOptions {
  format: 'excel' | 'pdf';
  columns: ExportColumn[];
  includeSubtotals: boolean;
  includeGrandTotal: boolean;
  budgetName: string;
  clientName?: string;
  projectName?: string;
}

const DEFAULT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'code', label: 'Código', type: 'text', visible: true },
  { key: 'short_description', label: 'Descripción', type: 'text', visible: true },
  { key: 'unit', label: 'Unidad', type: 'text', visible: true },
  { key: 'cantidad_real', label: 'Cantidad Real', type: 'number', visible: true },
  { key: 'desperdicio_pct', label: '% Desperdicio', type: 'percentage', visible: true },
  { key: 'cantidad', label: 'Cantidad', type: 'number', visible: true },
  { key: 'precio_real', label: 'Precio Real', type: 'currency', visible: true },
  { key: 'honorarios_pct', label: '% Honorarios', type: 'percentage', visible: true },
  { key: 'pu', label: 'P.U.', type: 'currency', visible: true },
  { key: 'total', label: 'Total', type: 'currency', visible: true },
  { key: 'provider', label: 'Proveedor', type: 'text', visible: false },
  { key: 'wbs_code', label: 'WBS Code', type: 'text', visible: false },
];

export const exportService = {
  /**
   * Obtener columnas por defecto para exportación
   */
  getDefaultColumns(): ExportColumn[] {
    return DEFAULT_EXPORT_COLUMNS.map(col => ({ ...col }));
  },

  /**
   * Exportar a Excel
   */
  async exportToExcel(
    partidas: any[],
    conceptos: any[],
    options: ExportOptions
  ): Promise<void> {
    const visibleColumns = options.columns.filter(col => col.visible);
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Datos para la hoja
    const rows: any[][] = [];
    
    // Encabezado del presupuesto
    rows.push([options.budgetName]);
    if (options.clientName) rows.push(['Cliente:', options.clientName]);
    if (options.projectName) rows.push(['Proyecto:', options.projectName]);
    rows.push(['Fecha de exportación:', new Date().toLocaleDateString('es-MX')]);
    rows.push([]); // Línea vacía

    // Encabezados de columnas
    rows.push(visibleColumns.map(col => col.label));

    // Datos por partida
    partidas.forEach(partida => {
      // Fila de partida (nombre en negritas - se aplicará después)
      rows.push([partida.name, ...Array(visibleColumns.length - 1).fill('')]);

      // Conceptos de la partida
      const partidaConceptos = conceptos.filter(c => c.partida_id === partida.id && c.active);
      
      partidaConceptos.forEach(concepto => {
        const row = visibleColumns.map(col => {
          const value = concepto[col.key];
          
          if (value === null || value === undefined) return '';
          
          switch (col.type) {
            case 'currency':
              return Number(value);
            case 'percentage':
              return Number(value) / 100; // Excel espera 0.15 para 15%
            case 'number':
              return Number(value);
            default:
              return String(value);
          }
        });
        rows.push(row);
      });

      // Subtotal de partida
      if (options.includeSubtotals) {
        const subtotal = partidaConceptos
          .filter(c => c.sumable)
          .reduce((sum, c) => sum + (c.total || 0), 0);
        
        const subtotalRow = Array(visibleColumns.length).fill('');
        const totalColIndex = visibleColumns.findIndex(col => col.key === 'total');
        if (totalColIndex >= 0) {
          subtotalRow[0] = 'Subtotal';
          subtotalRow[totalColIndex] = subtotal;
        }
        rows.push(subtotalRow);
      }

      rows.push([]); // Línea vacía entre partidas
    });

    // Gran total
    if (options.includeGrandTotal) {
      const grandTotal = conceptos
        .filter(c => c.active && c.sumable)
        .reduce((sum, c) => sum + (c.total || 0), 0);
      
      const totalRow = Array(visibleColumns.length).fill('');
      const totalColIndex = visibleColumns.findIndex(col => col.key === 'total');
      if (totalColIndex >= 0) {
        totalRow[0] = 'TOTAL GENERAL';
        totalRow[totalColIndex] = grandTotal;
      }
      rows.push(totalRow);
    }

    // Crear hoja
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Aplicar formato a columnas de moneda y porcentaje
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        
        if (!cell) continue;

        // Aplicar formato según tipo de columna
        if (R > 5) { // Después de los encabezados
          const colConfig = visibleColumns[C];
          if (!colConfig) continue;

          if (colConfig.type === 'currency') {
            cell.z = '$#,##0.00';
          } else if (colConfig.type === 'percentage') {
            cell.z = '0.00%';
          } else if (colConfig.type === 'number') {
            cell.z = '#,##0.00';
          }
        }
      }
    }

    // Ajustar anchos de columna
    ws['!cols'] = visibleColumns.map(col => {
      switch (col.type) {
        case 'currency':
          return { wch: 15 };
        case 'percentage':
          return { wch: 12 };
        case 'number':
          return { wch: 12 };
        default:
          return { wch: col.key === 'short_description' ? 40 : 15 };
      }
    });

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');

    // Descargar archivo
    const fileName = `${options.budgetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  },

  /**
   * Exportar a PDF (simplificado - usa window.print por ahora)
   */
  async exportToPDF(
    partidas: any[],
    conceptos: any[],
    options: ExportOptions
  ): Promise<void> {
    // Por ahora, generamos HTML y usamos window.print
    // En producción se podría usar jsPDF o similar
    
    const visibleColumns = options.columns.filter(col => col.visible);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${options.budgetName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          h1 {
            font-size: 18px;
            margin-bottom: 10px;
          }
          .info {
            margin-bottom: 20px;
            font-size: 11px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .partida-row {
            background-color: #e8f4f8;
            font-weight: bold;
          }
          .subtotal-row {
            background-color: #f9f9f9;
            font-weight: bold;
          }
          .total-row {
            background-color: #d4edda;
            font-weight: bold;
            font-size: 14px;
          }
          .currency {
            text-align: right;
          }
          .number {
            text-align: right;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>${options.budgetName}</h1>
        <div class="info">
          ${options.clientName ? `<div>Cliente: ${options.clientName}</div>` : ''}
          ${options.projectName ? `<div>Proyecto: ${options.projectName}</div>` : ''}
          <div>Fecha: ${new Date().toLocaleDateString('es-MX')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              ${visibleColumns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    // Datos por partida
    partidas.forEach(partida => {
      // Fila de partida
      html += `<tr class="partida-row">
        <td colspan="${visibleColumns.length}">${partida.name}</td>
      </tr>`;

      // Conceptos
      const partidaConceptos = conceptos.filter(c => c.partida_id === partida.id && c.active);
      
      partidaConceptos.forEach(concepto => {
        html += '<tr>';
        visibleColumns.forEach(col => {
          const value = concepto[col.key];
          let formatted = '';
          
          if (value !== null && value !== undefined) {
            switch (col.type) {
              case 'currency':
                formatted = formatAsCurrency(value);
                break;
              case 'percentage':
                formatted = formatAsPercentage(value);
                break;
              case 'number':
                formatted = toDisplayPrecision(value);
                break;
              default:
                formatted = String(value);
            }
          }
          
          const align = col.type === 'currency' || col.type === 'number' ? 'currency' : '';
          html += `<td class="${align}">${formatted}</td>`;
        });
        html += '</tr>';
      });

      // Subtotal
      if (options.includeSubtotals) {
        const subtotal = partidaConceptos
          .filter(c => c.sumable)
          .reduce((sum, c) => sum + (c.total || 0), 0);
        
        html += `<tr class="subtotal-row">
          <td>Subtotal</td>
          ${Array(visibleColumns.length - 2).fill('').map(() => '<td></td>').join('')}
          <td class="currency">${formatAsCurrency(subtotal)}</td>
        </tr>`;
      }
    });

    // Gran total
    if (options.includeGrandTotal) {
      const grandTotal = conceptos
        .filter(c => c.active && c.sumable)
        .reduce((sum, c) => sum + (c.total || 0), 0);
      
      html += `<tr class="total-row">
        <td>TOTAL GENERAL</td>
        ${Array(visibleColumns.length - 2).fill('').map(() => '<td></td>').join('')}
        <td class="currency">${formatAsCurrency(grandTotal)}</td>
      </tr>`;
    }

    html += `
          </tbody>
        </table>
        
        <button class="no-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
      </body>
      </html>
    `;

    // Abrir en nueva ventana y imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      // Auto-imprimir después de cargar
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  },
};
