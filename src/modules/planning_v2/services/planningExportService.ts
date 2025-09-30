/**
 * Export service for Planning v2 budgets
 * Handles PDF and Excel export with Mayor → Partida → Subpartida grouping
 */
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { formatAsCurrency } from '../utils/monetary';
import type { PlanningBudget, PlanningPartida, PlanningConcepto } from '../types';

interface CompanyBranding {
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

interface ExportOptions {
  budgetName: string;
  clientName?: string;
  projectName?: string;
  folio?: string;
  includeNotes: boolean;
  hideZeroRows: boolean;
  includeAttachments: boolean;
}

interface Attachment {
  id: string;
  concepto_id: string;
  file_name: string;
  created_at: string;
  concepto_short_description?: string;
}

interface GroupedData {
  mayorNombre: string;
  mayorCodigo: string;
  partidas: Array<{
    partida: PlanningPartida;
    subpartidas: Array<{
      wbsCode: string;
      conceptos: PlanningConcepto[];
      subtotal: number;
    }>;
    ungroupedConceptos: PlanningConcepto[];
    total: number;
  }>;
  total: number;
}

async function loadCompanyBranding(): Promise<CompanyBranding> {
  try {
    const { data, error } = await supabase
      .from('company_branding')
      .select('company_name, logo_url, address, phone, email, website')
      .maybeSingle();

    if (error) {
      console.warn('Error loading company branding:', error);
    }

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
}

async function fetchBudgetData(budgetId: string) {
  // Fetch budget
  const { data: budget, error: budgetError } = await supabase
    .from('planning_budgets')
    .select('*')
    .eq('id', budgetId)
    .single();

  if (budgetError) throw budgetError;

  // Fetch partidas
  const { data: partidas, error: partidasError } = await supabase
    .from('planning_partidas')
    .select('*')
    .eq('budget_id', budgetId)
    .eq('active', true)
    .order('order_index');

  if (partidasError) throw partidasError;

  // Fetch conceptos
  const { data: conceptos, error: conceptosError } = await supabase
    .from('planning_conceptos')
    .select('*')
    .in('partida_id', partidas.map(p => p.id))
    .eq('active', true)
    .order('order_index');

  if (conceptosError) throw conceptosError;

  // Type assertion for conceptos
  const typedConceptos = conceptos as unknown as PlanningConcepto[];

  // Fetch TU mappings to get Mayor info
  const { data: tuMappings, error: tuError } = await supabase
    .from('planning_tu_mapping')
    .select(`
      *,
      chart_of_accounts_mayor(codigo, nombre)
    `)
    .in('partida_id', partidas.map(p => p.id));

  if (tuError) throw tuError;

  return { budget, partidas, conceptos: typedConceptos, tuMappings };
}

async function fetchAttachments(conceptoIds: string[]): Promise<Attachment[]> {
  if (conceptoIds.length === 0) return [];

  const { data, error } = await supabase
    .from('planning_concepto_attachments')
    .select('id, concepto_id, file_name, created_at')
    .in('concepto_id', conceptoIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching attachments:', error);
    return [];
  }

  return data || [];
}

function groupDataByMayor(
  partidas: PlanningPartida[],
  conceptos: PlanningConcepto[],
  tuMappings: any[],
  hideZeroRows: boolean
): GroupedData[] {
  const mayorGroups = new Map<string, GroupedData>();

  for (const partida of partidas) {
    // Find TU mapping for this partida
    const mapping = tuMappings.find(m => m.partida_id === partida.id);
    const mayorInfo = mapping?.chart_of_accounts_mayor;
    const mayorKey = mayorInfo?.nombre || 'Sin Mayor';
    const mayorCodigo = mayorInfo?.codigo || '';

    // Get or create mayor group
    if (!mayorGroups.has(mayorKey)) {
      mayorGroups.set(mayorKey, {
        mayorNombre: mayorKey,
        mayorCodigo,
        partidas: [],
        total: 0,
      });
    }

    const mayorGroup = mayorGroups.get(mayorKey)!;

    // Get conceptos for this partida
    const partidaConceptos = conceptos.filter(c => c.partida_id === partida.id);

    // Group conceptos by WBS code (subpartida)
    const wbsGroups = new Map<string, PlanningConcepto[]>();
    const ungroupedConceptos: PlanningConcepto[] = [];

    for (const concepto of partidaConceptos) {
      if (hideZeroRows && (concepto.total === 0 || concepto.cantidad_real === 0)) {
        continue;
      }

      if (concepto.wbs_code) {
        const group = wbsGroups.get(concepto.wbs_code) || [];
        group.push(concepto);
        wbsGroups.set(concepto.wbs_code, group);
      } else {
        ungroupedConceptos.push(concepto);
      }
    }

    // Calculate totals
    const subpartidas = Array.from(wbsGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([wbsCode, conceptos]) => ({
        wbsCode,
        conceptos,
        subtotal: conceptos
          .filter(c => c.sumable)
          .reduce((sum, c) => sum + c.total, 0),
      }));

    const partidaTotal = [
      ...subpartidas.flatMap(s => s.conceptos),
      ...ungroupedConceptos,
    ]
      .filter(c => c.sumable)
      .reduce((sum, c) => sum + c.total, 0);

    mayorGroup.partidas.push({
      partida,
      subpartidas,
      ungroupedConceptos,
      total: partidaTotal,
    });

    mayorGroup.total += partidaTotal;
  }

  return Array.from(mayorGroups.values()).sort((a, b) =>
    a.mayorCodigo.localeCompare(b.mayorCodigo)
  );
}

export async function exportPlanningBudget({
  budgetId,
  format,
  options,
}: {
  budgetId: string;
  format: 'pdf' | 'excel';
  options: ExportOptions;
}) {
  // Load data
  const [branding, budgetData] = await Promise.all([
    loadCompanyBranding(),
    fetchBudgetData(budgetId),
  ]);

  const { budget, partidas, conceptos, tuMappings } = budgetData;

  // Group data by Mayor
  const groupedData = groupDataByMayor(
    partidas,
    conceptos,
    tuMappings,
    options.hideZeroRows
  );

  // Fetch attachments if needed
  let attachments: Attachment[] = [];
  if (options.includeAttachments && format === 'pdf') {
    attachments = await fetchAttachments(conceptos.map(c => c.id));
    
    // Add concepto descriptions to attachments
    attachments = attachments.map(att => {
      const concepto = conceptos.find(c => c.id === att.concepto_id);
      return {
        ...att,
        concepto_short_description: concepto?.short_description,
      };
    });
  }

  // Calculate grand total
  const grandTotal = groupedData.reduce((sum, g) => sum + g.total, 0);

  if (format === 'excel') {
    await exportToExcel(branding, options, groupedData, grandTotal);
  } else {
    await exportToPDF(branding, options, groupedData, grandTotal, partidas, attachments);
  }
}

async function exportToExcel(
  branding: CompanyBranding,
  options: ExportOptions,
  groupedData: GroupedData[],
  grandTotal: number
) {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  // Header with branding
  rows.push([branding.company_name]);
  if (branding.address) rows.push(['Dirección:', branding.address]);
  if (branding.phone) rows.push(['Teléfono:', branding.phone]);
  if (branding.email) rows.push(['Email:', branding.email]);
  rows.push([]);

  // Budget info
  rows.push([options.budgetName]);
  if (options.clientName) rows.push(['Cliente:', options.clientName]);
  if (options.projectName) rows.push(['Proyecto:', options.projectName]);
  rows.push(['Fecha de exportación:', new Date().toLocaleDateString('es-MX')]);
  if (options.folio) rows.push(['Folio:', options.folio]);
  rows.push([]);

  // Column headers
  rows.push([
    'Código',
    'Descripción',
    'Unidad',
    'Cant. Real',
    '% Desp.',
    'Cantidad',
    'P. Real',
    '% Hon.',
    'P.U.',
    'Total',
  ]);

  // Data rows
  for (const mayorGroup of groupedData) {
    // Mayor header
    rows.push([`${mayorGroup.mayorCodigo} - ${mayorGroup.mayorNombre}`, '', '', '', '', '', '', '', '', '']);

    for (const { partida, subpartidas, ungroupedConceptos, total } of mayorGroup.partidas) {
      // Partida header
      rows.push([`  ${partida.name}`, '', '', '', '', '', '', '', '', '']);
      
      // Notes if enabled
      if (options.includeNotes && partida.notes) {
        rows.push([`    Nota: ${partida.notes}`, '', '', '', '', '', '', '', '', '']);
      }

      // Subpartidas
      for (const { wbsCode, conceptos, subtotal } of subpartidas) {
        rows.push([`    Subpartida: ${wbsCode}`, '', '', '', '', '', '', '', '', '']);

        for (const concepto of conceptos) {
          rows.push([
            concepto.code || '',
            `      ${concepto.short_description}`,
            concepto.unit,
            concepto.cantidad_real,
            concepto.desperdicio_pct,
            concepto.cantidad,
            concepto.precio_real,
            concepto.honorarios_pct,
            concepto.pu,
            concepto.sumable ? concepto.total : '',
          ]);
        }

        rows.push(['', `    Subtotal ${wbsCode}:`, '', '', '', '', '', '', '', subtotal]);
      }

      // Ungrouped conceptos
      for (const concepto of ungroupedConceptos) {
        rows.push([
          concepto.code || '',
          `    ${concepto.short_description}`,
          concepto.unit,
          concepto.cantidad_real,
          concepto.desperdicio_pct,
          concepto.cantidad,
          concepto.precio_real,
          concepto.honorarios_pct,
          concepto.pu,
          concepto.sumable ? concepto.total : '',
        ]);
      }

      rows.push(['', `  Total ${partida.name}:`, '', '', '', '', '', '', '', total]);
    }

    rows.push(['', `Total ${mayorGroup.mayorNombre}:`, '', '', '', '', '', '', '', mayorGroup.total]);
    rows.push([]);
  }

  // Grand total
  rows.push(['', 'TOTAL GENERAL:', '', '', '', '', '', '', '', grandTotal]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Format currency columns
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) continue;

      // Currency columns: P. Real (6), P.U. (8), Total (9)
      if ([6, 8, 9].includes(C) && typeof cell.v === 'number') {
        cell.z = '$#,##0.00';
      }
      // Percentage columns: % Desp. (4), % Hon. (7)
      if ([4, 7].includes(C) && typeof cell.v === 'number') {
        cell.z = '0.00%';
      }
      // Number columns: Cant. Real (3), Cantidad (5)
      if ([3, 5].includes(C) && typeof cell.v === 'number') {
        cell.z = '#,##0.00';
      }
    }
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Código
    { wch: 50 }, // Descripción
    { wch: 10 }, // Unidad
    { wch: 12 }, // Cant. Real
    { wch: 10 }, // % Desp.
    { wch: 12 }, // Cantidad
    { wch: 15 }, // P. Real
    { wch: 10 }, // % Hon.
    { wch: 15 }, // P.U.
    { wch: 15 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');

  // Download
  const fileName = `${options.budgetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

async function exportToPDF(
  branding: CompanyBranding,
  options: ExportOptions,
  groupedData: GroupedData[],
  grandTotal: number,
  partidas: PlanningPartida[],
  attachments: Attachment[]
) {
  // Create HTML for PDF
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${options.budgetName}</title>
      <style>
        @page { 
          size: letter landscape; 
          margin: 0.5in; 
        }
        body {
          font-family: 'Arial', sans-serif;
          font-size: 9pt;
          line-height: 1.3;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 16pt;
          color: #333;
        }
        .header .info {
          font-size: 8pt;
          color: #666;
          margin-top: 5px;
        }
        .budget-info {
          margin-bottom: 15px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .budget-info div {
          margin: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 8pt;
        }
        th {
          background: #333;
          color: white;
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 4px;
          border-bottom: 1px solid #ddd;
        }
        .mayor-header {
          background: #e0e0e0;
          font-weight: bold;
          padding: 6px 4px;
          font-size: 10pt;
        }
        .partida-header {
          background: #f0f0f0;
          font-weight: bold;
          padding: 5px 8px;
          font-size: 9pt;
        }
        .subpartida-header {
          background: #f8f8f8;
          font-weight: bold;
          padding: 4px 12px;
          font-size: 8.5pt;
          font-style: italic;
        }
        .concepto-row {
          padding-left: 20px;
        }
        .note {
          font-style: italic;
          color: #666;
          padding: 3px 12px;
          font-size: 8pt;
        }
        .subtotal-row {
          background: #f8f8f8;
          font-weight: bold;
        }
        .total-row {
          background: #e8e8e8;
          font-weight: bold;
        }
        .grand-total {
          background: #333;
          color: white;
          font-weight: bold;
          font-size: 11pt;
          padding: 8px 4px;
        }
        .text-right {
          text-align: right;
        }
        .attachments {
          margin-top: 20px;
          page-break-before: always;
        }
        .attachments h2 {
          font-size: 12pt;
          margin-bottom: 10px;
        }
        .attachments table {
          font-size: 8pt;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <h1>${branding.company_name}</h1>
        <div class="info">
          ${branding.address ? branding.address + ' | ' : ''}
          ${branding.phone ? 'Tel: ' + branding.phone + ' | ' : ''}
          ${branding.email ? branding.email : ''}
        </div>
      </div>

      <!-- Budget Info -->
      <div class="budget-info">
        <div><strong>Presupuesto:</strong> ${options.budgetName}</div>
        ${options.clientName ? `<div><strong>Cliente:</strong> ${options.clientName}</div>` : ''}
        ${options.projectName ? `<div><strong>Proyecto:</strong> ${options.projectName}</div>` : ''}
        <div><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</div>
        ${options.folio ? `<div><strong>Folio:</strong> ${options.folio}</div>` : ''}
      </div>

      <!-- Data Table -->
      <table>
        <thead>
          <tr>
            <th style="width: 10%">Código</th>
            <th style="width: 30%">Descripción</th>
            <th style="width: 8%">Unidad</th>
            <th style="width: 8%">Cant. Real</th>
            <th style="width: 7%">% Desp.</th>
            <th style="width: 8%">Cantidad</th>
            <th style="width: 10%">P. Real</th>
            <th style="width: 7%">% Hon.</th>
            <th style="width: 10%">P.U.</th>
            <th style="width: 10%">Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Data rows
  for (const mayorGroup of groupedData) {
    html += `
      <tr class="mayor-header">
        <td colspan="10">${mayorGroup.mayorCodigo} - ${mayorGroup.mayorNombre}</td>
      </tr>
    `;

    for (const { partida, subpartidas, ungroupedConceptos, total } of mayorGroup.partidas) {
      html += `
        <tr class="partida-header">
          <td colspan="10">${partida.name}</td>
        </tr>
      `;

      if (options.includeNotes && partida.notes) {
        html += `
          <tr>
            <td colspan="10" class="note">Nota: ${partida.notes}</td>
          </tr>
        `;
      }

      // Subpartidas
      for (const { wbsCode, conceptos, subtotal } of subpartidas) {
        html += `
          <tr class="subpartida-header">
            <td colspan="10">Subpartida: ${wbsCode}</td>
          </tr>
        `;

        for (const concepto of conceptos) {
          html += `
            <tr class="concepto-row">
              <td>${concepto.code || ''}</td>
              <td>${concepto.short_description}</td>
              <td>${concepto.unit}</td>
              <td class="text-right">${concepto.cantidad_real.toFixed(2)}</td>
              <td class="text-right">${(concepto.desperdicio_pct * 100).toFixed(2)}%</td>
              <td class="text-right">${concepto.cantidad.toFixed(2)}</td>
              <td class="text-right">${formatAsCurrency(concepto.precio_real)}</td>
              <td class="text-right">${(concepto.honorarios_pct * 100).toFixed(2)}%</td>
              <td class="text-right">${formatAsCurrency(concepto.pu)}</td>
              <td class="text-right">${concepto.sumable ? formatAsCurrency(concepto.total) : ''}</td>
            </tr>
          `;
        }

        html += `
          <tr class="subtotal-row">
            <td colspan="9" style="text-align: right; padding-right: 10px;">Subtotal ${wbsCode}:</td>
            <td class="text-right">${formatAsCurrency(subtotal)}</td>
          </tr>
        `;
      }

      // Ungrouped conceptos
      for (const concepto of ungroupedConceptos) {
        html += `
          <tr class="concepto-row">
            <td>${concepto.code || ''}</td>
            <td>${concepto.short_description}</td>
            <td>${concepto.unit}</td>
            <td class="text-right">${concepto.cantidad_real.toFixed(2)}</td>
            <td class="text-right">${(concepto.desperdicio_pct * 100).toFixed(2)}%</td>
            <td class="text-right">${concepto.cantidad.toFixed(2)}</td>
            <td class="text-right">${formatAsCurrency(concepto.precio_real)}</td>
            <td class="text-right">${(concepto.honorarios_pct * 100).toFixed(2)}%</td>
            <td class="text-right">${formatAsCurrency(concepto.pu)}</td>
            <td class="text-right">${concepto.sumable ? formatAsCurrency(concepto.total) : ''}</td>
          </tr>
        `;
      }

      html += `
        <tr class="total-row">
          <td colspan="9" style="text-align: right; padding-right: 10px;">Total ${partida.name}:</td>
          <td class="text-right">${formatAsCurrency(total)}</td>
        </tr>
      `;
    }

    html += `
      <tr class="total-row">
        <td colspan="9" style="text-align: right; padding-right: 10px;">Total ${mayorGroup.mayorNombre}:</td>
        <td class="text-right">${formatAsCurrency(mayorGroup.total)}</td>
      </tr>
    `;
  }

  // Grand total
  html += `
        <tr class="grand-total">
          <td colspan="9" style="text-align: right; padding-right: 10px;">TOTAL GENERAL:</td>
          <td class="text-right">${formatAsCurrency(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Attachments section
  if (attachments.length > 0) {
    html += `
      <div class="attachments">
        <h2>Archivos Adjuntos</h2>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Nombre de Archivo</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const attachment of attachments) {
      html += `
        <tr>
          <td>${attachment.concepto_short_description || 'N/A'}</td>
          <td>${attachment.file_name}</td>
          <td>${new Date(attachment.created_at).toLocaleDateString('es-MX')}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  html += `
    </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Open in new window and trigger print
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
