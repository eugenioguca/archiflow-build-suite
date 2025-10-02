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
  // Use new jsPDF-based export
  const { exportBudgetPdf } = await import('./export/pdf/exportBudgetPdf');
  
  await exportBudgetPdf({
    projectName: options.projectName || options.budgetName,
    clientName: options.clientName,
    folio: options.folio,
    generatedAt: new Date(),
    groupedData,
    grandTotal,
  });
}
