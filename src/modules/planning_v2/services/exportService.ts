/**
 * Servicio de exportación para Planning v2
 * Soporta PDF y Excel con columnas configurables y branding corporativo
 */
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../utils/monetary';

interface CompanyBranding {
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

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
  hideZeroRows?: boolean;
  budgetName: string;
  clientName?: string;
  projectName?: string;
  folio?: string;
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
   * Cargar branding corporativo
   */
  async loadCompanyBranding(): Promise<CompanyBranding> {
    try {
      const { data, error } = await supabase
        .from('company_branding')
        .select('company_name, logo_url, address, phone, email, website')
        .maybeSingle();

      if (error) {
        console.warn('Error loading company branding:', error);
      }

      // Fallback neutral si no hay branding configurado
      return {
        company_name: data?.company_name || 'Empresa',
        logo_url: data?.logo_url || null,
        address: data?.address || null,
        phone: data?.phone || null,
        email: data?.email || null,
        website: data?.website || null,
      };
    } catch (error) {
      console.error('Error loading branding:', error);
      return {
        company_name: 'Empresa',
        logo_url: null,
        address: null,
        phone: null,
        email: null,
        website: null,
      };
    }
  },

  /**
   * Obtener columnas por defecto para exportación
   */
  getDefaultColumns(): ExportColumn[] {
    return DEFAULT_EXPORT_COLUMNS.map(col => ({ ...col }));
  },

  /**
   * Exportar a Excel con branding
   */
  async exportToExcel(
    partidas: any[],
    conceptos: any[],
    options: ExportOptions
  ): Promise<void> {
    // Cargar branding
    const branding = await this.loadCompanyBranding();
    
    const visibleColumns = options.columns.filter(col => col.visible);
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Datos para la hoja
    const rows: any[][] = [];
    
    // Encabezado con branding
    rows.push([branding.company_name]);
    if (branding.address) rows.push(['Dirección:', branding.address]);
    if (branding.phone) rows.push(['Teléfono:', branding.phone]);
    if (branding.email) rows.push(['Email:', branding.email]);
    rows.push([]); // Línea vacía
    
    // Información del presupuesto
    rows.push([options.budgetName]);
    if (options.clientName) rows.push(['Cliente:', options.clientName]);
    if (options.projectName) rows.push(['Proyecto:', options.projectName]);
    rows.push(['Fecha de exportación:', new Date().toLocaleDateString('es-MX')]);
    if (options.folio) rows.push(['Folio:', options.folio]);
    rows.push([]); // Línea vacía

    // Encabezados de columnas
    rows.push(visibleColumns.map(col => col.label));

    // Datos por partida
    partidas.forEach(partida => {
      // Fila de partida (nombre en negritas - se aplicará después)
      rows.push([partida.name, ...Array(visibleColumns.length - 1).fill('')]);

      // Conceptos de la partida
      let partidaConceptos = conceptos.filter(c => c.partida_id === partida.id && c.active);
      
      // Filtrar conceptos con total en cero si la opción está habilitada
      if (options.hideZeroRows) {
        partidaConceptos = partidaConceptos.filter(c => (c.total || 0) !== 0);
      }
      
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
        if (R > 9) { // Después de los encabezados con branding
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
   * Test de round-trip: exportar e importar debe mantener totales
   */
  async testRoundTrip(
    partidas: any[],
    conceptos: any[],
    options: ExportOptions
  ): Promise<{ success: boolean; message: string; originalTotal: number; importedTotal: number }> {
    try {
      // Calcular total original
      const originalTotal = conceptos
        .filter(c => c.active && c.sumable)
        .reduce((sum, c) => sum + (c.total || 0), 0);

      // Exportar a Excel
      const visibleColumns = options.columns.filter(col => col.visible);
      const branding = await this.loadCompanyBranding();
      
      const rows: any[][] = [];
      
      // Encabezados (similar al export real)
      rows.push([branding.company_name]);
      if (branding.address) rows.push(['Dirección:', branding.address]);
      if (branding.phone) rows.push(['Teléfono:', branding.phone]);
      if (branding.email) rows.push(['Email:', branding.email]);
      rows.push([]);
      rows.push([options.budgetName]);
      if (options.clientName) rows.push(['Cliente:', options.clientName]);
      if (options.projectName) rows.push(['Proyecto:', options.projectName]);
      rows.push(['Fecha de exportación:', new Date().toLocaleDateString('es-MX')]);
      if (options.folio) rows.push(['Folio:', options.folio]);
      rows.push([]);
      rows.push(visibleColumns.map(col => col.label));

      // Datos
      partidas.forEach(partida => {
        rows.push([partida.name, ...Array(visibleColumns.length - 1).fill('')]);
        
        const partidaConceptos = conceptos.filter(c => c.partida_id === partida.id && c.active);
        
        partidaConceptos.forEach(concepto => {
          const row = visibleColumns.map(col => {
            const value = concepto[col.key];
            if (value === null || value === undefined) return '';
            
            switch (col.type) {
              case 'currency':
              case 'number':
                return Number(value);
              case 'percentage':
                return Number(value) / 100;
              default:
                return String(value);
            }
          });
          rows.push(row);
        });
      });

      // Simular import: recrear conceptos desde rows
      const importedConceptos: any[] = [];
      let currentPartidaName = '';
      const headerRowIndex = 10; // Después del branding

      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Detectar partida (primera columna llena, resto vacío)
        if (row[0] && row.slice(1).every((c: any) => !c)) {
          currentPartidaName = row[0];
          continue;
        }

        // Detectar concepto (tiene datos en columnas relevantes)
        if (row[0] && row[0] !== 'Subtotal' && row[0] !== 'TOTAL GENERAL') {
          const concepto: any = {};
          visibleColumns.forEach((col, idx) => {
            const value = row[idx];
            if (value !== null && value !== undefined && value !== '') {
              if (col.type === 'percentage') {
                concepto[col.key] = Number(value) * 100;
              } else {
                concepto[col.key] = value;
              }
            }
          });
          
          // Recalcular total basado en campos importados
          const cantidadReal = concepto.cantidad_real || 0;
          const desperdicoPct = concepto.desperdicio_pct || 0;
          const precioReal = concepto.precio_real || 0;
          const honorariosPct = concepto.honorarios_pct || 0;
          
          const cantidad = cantidadReal * (1 + desperdicoPct / 100);
          const pu = precioReal * (1 + honorariosPct / 100);
          concepto.total = cantidad * pu;
          concepto.active = true;
          concepto.sumable = true;
          
          importedConceptos.push(concepto);
        }
      }

      // Calcular total importado
      const importedTotal = importedConceptos
        .filter(c => c.active && c.sumable)
        .reduce((sum, c) => sum + (c.total || 0), 0);

      // Comparar con tolerancia de 0.01 por errores de redondeo
      const difference = Math.abs(originalTotal - importedTotal);
      const success = difference < 0.01;

      return {
        success,
        message: success
          ? `Test exitoso: Totales coinciden ($${originalTotal.toFixed(2)} ≈ $${importedTotal.toFixed(2)})`
          : `Test fallido: Diferencia de $${difference.toFixed(2)} (original: $${originalTotal.toFixed(2)}, importado: $${importedTotal.toFixed(2)})`,
        originalTotal,
        importedTotal,
      };
    } catch (error) {
      console.error('Error in round-trip test:', error);
      return {
        success: false,
        message: `Error en test: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        originalTotal: 0,
        importedTotal: 0,
      };
    }
  },

  /**
   * Exportar a PDF con branding
   */
  async exportToPDF(
    partidas: any[],
    conceptos: any[],
    options: ExportOptions
  ): Promise<void> {
    // Cargar branding
    const branding = await this.loadCompanyBranding();
    
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
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .logo {
            max-width: 150px;
            max-height: 80px;
          }
          .company-info {
            text-align: right;
            font-size: 11px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
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
        <div class="header">
          <div>
            ${branding.logo_url ? `<img src="${branding.logo_url}" alt="Logo" class="logo" />` : ''}
          </div>
          <div class="company-info">
            <div class="company-name">${branding.company_name}</div>
            ${branding.address ? `<div>${branding.address}</div>` : ''}
            ${branding.phone ? `<div>Tel: ${branding.phone}</div>` : ''}
            ${branding.email ? `<div>${branding.email}</div>` : ''}
            ${branding.website ? `<div>${branding.website}</div>` : ''}
          </div>
        </div>
        
        <h1>${options.budgetName}</h1>
        <div class="info">
          ${options.clientName ? `<div>Cliente: ${options.clientName}</div>` : ''}
          ${options.projectName ? `<div>Proyecto: ${options.projectName}</div>` : ''}
          <div>Fecha: ${new Date().toLocaleDateString('es-MX')}</div>
          ${options.folio ? `<div>Folio: ${options.folio}</div>` : ''}
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
      let partidaConceptos = conceptos.filter(c => c.partida_id === partida.id && c.active);
      
      // Filtrar conceptos con total en cero si la opción está habilitada
      if (options.hideZeroRows) {
        partidaConceptos = partidaConceptos.filter(c => (c.total || 0) !== 0);
      }
      
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
