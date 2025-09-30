/**
 * Servicio para gestión de plantillas de presupuesto
 */
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import type { TemplateDelta } from '../types';

export interface TemplatePartida {
  code: string;
  name: string;
  order: number;
}

export interface TemplateConcepto {
  partida_code: string;
  code: string;
  short_description: string;
  unit: string;
  cantidad_real: number;
  desperdicio_pct: number;
  precio_real: number;
  honorarios_pct: number;
  notes?: string;
}

export interface TemplateData {
  partidas: TemplatePartida[];
  conceptos: TemplateConcepto[];
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string | null;
  is_main: boolean;
  template_data: TemplateData;
  metadata: {
    total_partidas: number;
    total_conceptos: number;
    source_file?: string;
  };
  created_at: string;
}

/**
 * Parsear archivo Excel con formato Planning v2
 * Espera 3 sheets: ParametrosPresupuesto, diccionario, Plantilla
 */
export async function parseCAMMExcel(file: File): Promise<TemplateData & { params?: any; mappings?: any }> {
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Validar sheets requeridos
        const sheetNames = workbook.SheetNames;
        const hasParams = sheetNames.includes('ParametrosPresupuesto');
        const hasDict = sheetNames.includes('diccionario');
        const hasPlantilla = sheetNames.includes('Plantilla');
        
        if (!hasPlantilla) {
          throw new Error('Falta sheet requerido: Plantilla');
        }
        
        // Parse Plantilla sheet
        const plantillaSheet = workbook.Sheets['Plantilla'];
        const plantillaRows = XLSX.utils.sheet_to_json(plantillaSheet, { header: 1, raw: false }) as any[][];
        
        const partidas: TemplatePartida[] = [];
        const conceptos: TemplateConcepto[] = [];
        
        // Find header row (buscar "codigo" o "code")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, plantillaRows.length); i++) {
          const row = plantillaRows[i];
          if (row && row.length > 0) {
            const firstCell = String(row[0] || '').toLowerCase().trim();
            if (firstCell.includes('codigo') || firstCell.includes('code') || firstCell.includes('clave')) {
              headerRowIndex = i;
              break;
            }
          }
        }
        
        if (headerRowIndex === -1) {
          throw new Error('No se encontró fila de encabezados en sheet Plantilla. Debe incluir: codigo, concepto_descripcion, unidad, etc.');
        }
        
        // Parse header
        const headers = plantillaRows[headerRowIndex].map(h => String(h || '').toLowerCase().trim());
        const requiredCols = ['codigo', 'concepto_descripcion', 'unidad'];
        const missingCols = requiredCols.filter(col => !headers.some(h => h.includes(col.split('_')[0])));
        
        if (missingCols.length > 0) {
          throw new Error(`Faltan columnas requeridas: ${missingCols.join(', ')}`);
        }
        
        // Column indices
        const colIndexes: Record<string, number> = {};
        headers.forEach((h, i) => {
          if (h.includes('codigo') || h.includes('code') || h.includes('clave')) colIndexes.codigo = i;
          if (h.includes('partida') && h.includes('codigo')) colIndexes.partida_codigo = i;
          if (h.includes('partida') && h.includes('nombre')) colIndexes.partida_nombre = i;
          if (h.includes('concepto') && h.includes('desc')) colIndexes.concepto_descripcion = i;
          if (h.includes('unidad') || h.includes('unit')) colIndexes.unidad = i;
          if (h.includes('cantidad')) colIndexes.cantidad_real = i;
          if (h.includes('desperdicio') || h.includes('waste')) colIndexes.desperdicio_pct = i;
          if (h.includes('precio') || h.includes('price')) colIndexes.precio_real = i;
          if (h.includes('honorarios') || h.includes('fee')) colIndexes.honorarios_pct = i;
          if (h.includes('notas') || h.includes('notes')) colIndexes.notas = i;
        });
        
        let currentPartida: string | null = null;
        let partidaOrder = 0;
        const partidasSeen = new Set<string>();
        
        // Parse data rows
        for (let i = headerRowIndex + 1; i < plantillaRows.length; i++) {
          const row = plantillaRows[i];
          if (!row || row.length === 0) continue;
          
          const codigo = String(row[colIndexes.codigo] || '').trim();
          if (!codigo) continue;
          
          // Detect partida row (starts with P or is explicitly a partida)
          const esPartida = codigo.match(/^P\d+/) || (colIndexes.partida_codigo !== undefined && row[colIndexes.partida_codigo]);
          
          if (esPartida) {
            const partidaCodigo = colIndexes.partida_codigo !== undefined 
              ? String(row[colIndexes.partida_codigo] || codigo).trim()
              : codigo;
            const partidaNombre = colIndexes.partida_nombre !== undefined
              ? String(row[colIndexes.partida_nombre] || '').trim()
              : String(row[colIndexes.concepto_descripcion] || '').trim();
            
            if (!partidasSeen.has(partidaCodigo)) {
              partidas.push({
                code: partidaCodigo,
                name: partidaNombre || partidaCodigo,
                order: partidaOrder++
              });
              partidasSeen.add(partidaCodigo);
              currentPartida = partidaCodigo;
            }
            continue;
          }
          
          // Concepto row
          if (currentPartida) {
            conceptos.push({
              partida_code: currentPartida,
              code: codigo,
              short_description: String(row[colIndexes.concepto_descripcion] || '').trim(),
              unit: String(row[colIndexes.unidad] || 'PZA').trim(),
              cantidad_real: colIndexes.cantidad_real !== undefined ? parseNumberEsMX(row[colIndexes.cantidad_real]) : 0,
              desperdicio_pct: colIndexes.desperdicio_pct !== undefined ? parsePercentageEsMX(row[colIndexes.desperdicio_pct]) : 0,
              precio_real: colIndexes.precio_real !== undefined ? parseNumberEsMX(row[colIndexes.precio_real]) : 0,
              honorarios_pct: colIndexes.honorarios_pct !== undefined ? parsePercentageEsMX(row[colIndexes.honorarios_pct]) : 0,
              notes: colIndexes.notas !== undefined ? String(row[colIndexes.notas] || '').trim() : ''
            });
          }
        }
        
        if (partidas.length === 0) {
          throw new Error('No se encontraron partidas válidas en la plantilla');
        }
        
        resolve({ partidas, conceptos });
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        reject(new Error(`Error al parsear Excel: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Parsear número con formato es-MX (coma miles, punto decimal)
 */
export function parseNumberEsMX(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Eliminar símbolos de moneda, espacios
  let cleaned = String(value).replace(/[$\s]/g, '');
  
  // es-MX usa coma para miles, punto para decimal
  // Remover comas (miles)
  cleaned = cleaned.replace(/,/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parsear porcentaje es-MX (ej: "17%" o 0.17 o "17")
 */
export function parsePercentageEsMX(value: any): number {
  if (typeof value === 'number') {
    // Si es decimal (0.17), ya está en formato correcto
    return value < 1 ? value : value / 100;
  }
  
  if (!value) return 0;
  
  const str = String(value).replace('%', '').trim();
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  
  // Si es > 1, asumimos que está en formato porcentaje (17 = 17%)
  return parsed > 1 ? parsed / 100 : parsed;
}

/**
 * Guardar plantilla en Supabase
 */
export async function saveTemplate(
    name: string,
    templateData: TemplateData,
    options: {
      description?: string;
      isMain?: boolean;
      sourceFile?: string;
    } = {}
  ): Promise<string> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (!profile) throw new Error('Usuario no autenticado');
    
    const { data, error } = await supabase
      .from('planning_templates')
      .insert({
        name,
        description: options.description,
        is_main: options.isMain || false,
        template_data: templateData,
        metadata: {
          total_partidas: templateData.partidas.length,
          total_conceptos: templateData.conceptos.length,
          source_file: options.sourceFile
        },
        created_by: profile.id
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
}

/**
 * Obtener todas las plantillas
 */
export async function getTemplates(): Promise<BudgetTemplate[]> {
  const { data, error } = await supabase
    .from('planning_templates')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []) as any as BudgetTemplate[];
}

/**
 * Obtener plantilla por ID (alias para compatibilidad)
 */
export async function getTemplateById(templateId: string): Promise<BudgetTemplate | null> {
  return getTemplate(templateId);
}

/**
 * Obtener plantilla por ID
 */
export async function getTemplate(templateId: string): Promise<BudgetTemplate | null> {
  const { data, error } = await supabase
    .from('planning_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();
  
  if (error) throw error;
  return data as any as BudgetTemplate;
}

/**
 * Crear plantilla
 */
export async function createTemplate(template: Omit<BudgetTemplate, 'id' | 'created_at'>): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();
  
  if (!profile) throw new Error('Usuario no autenticado');
  
  const { data, error } = await supabase
    .from('planning_templates')
    .insert([{
      name: template.name,
      version: '1.0',
      meta: JSON.parse(JSON.stringify({
        description: template.description,
        is_main: template.is_main,
        template_data: template.template_data,
        metadata: template.metadata
      }))
    }])
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

/**
 * Actualizar plantilla
 */
export async function updateTemplate(id: string, updates: Partial<BudgetTemplate>): Promise<void> {
  const { error } = await supabase
    .from('planning_templates')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Eliminar plantilla
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('planning_templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Obtener campos de plantilla
 */
export async function getTemplateFields(templateId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('planning_template_fields')
    .select('*')
    .eq('template_id', templateId)
    .order('field_order');
  
  if (error) throw error;
  return data || [];
}

/**
 * Obtener partidas de plantilla
 */
export async function getTemplatePartidas(templateId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('planning_template_partidas')
    .select('*')
    .eq('template_id', templateId)
    .order('order');
  
  if (error) throw error;
  return data || [];
}

/**
 * Obtener conceptos de plantilla
 */
export async function getTemplateConceptosByTemplate(templateId: string): Promise<any[]> {
  try {
    const result: any = await (supabase as any)
      .from('planning_template_conceptos')
      .select('*')
      .eq('template_id', templateId)
      .order('order');
    
    if (result.error) throw result.error;
    return result.data || [];
  } catch (error) {
    console.error('Error fetching template conceptos:', error);
    return [];
  }
}

/**
 * Calcular delta entre presupuesto y plantilla
 */
export async function calculateTemplateDelta(templateId: string, budgetId: string): Promise<any> {
  // Get template data
  const template = await getTemplate(templateId);
  if (!template) throw new Error('Plantilla no encontrada');
  
  // Get current budget partidas and conceptos
  const partidas: any[] = [];
  const conceptos: any[] = [];
  
  return calculateDelta(partidas || [], conceptos || [], template.template_data);
}

/**
 * Aplicar plantilla a presupuesto
 */
export async function applyTemplate(templateId: string, budgetId: string, delta: any): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();
  
  if (!profile) throw new Error('Usuario no autenticado');
  
  // Simplify delta handling with explicit typing
  const newPartidas: any[] = (delta as any).newPartidas || [];
  const newConceptos: any[] = (delta as any).newConceptos || [];
  
  // Insert new partidas
  if (delta.newPartidas.length > 0) {
    const { error: partidasError } = await supabase
      .from('planning_partidas')
      .insert(
        delta.newPartidas.map((p) => ({
          budget_id: budgetId,
          name: p.name,
          order: p.order,
          created_by: profile.id
        }))
      );
    
    if (partidasError) throw partidasError;
  }
  
  // Get partida mapping (name -> id)
  const { data: allPartidas } = await supabase
    .from('planning_partidas')
    .select('id, name')
    .eq('budget_id', budgetId);
  
  const partidaMap = new Map(allPartidas?.map((p: any) => [p.name, p.id]) || []);
  
  // Insert new conceptos
  if (newConceptos.length > 0) {
    const conceptosToInsert = newConceptos
      .map((c: any) => {
        const partida = newPartidas.find((p: any) => p.code === c.partida_code);
        const partidaId = partida ? partidaMap.get(partida.name) : null;
        
        if (!partidaId) return null;
        
        return {
          budget_id: budgetId,
          partida_id: partidaId,
          code: c.code,
          short_description: c.short_description,
          unit: c.unit,
          cantidad_real: c.cantidad_real,
          desperdicio_pct: c.desperdicio_pct,
          precio_real: c.precio_real,
          honorarios_pct: c.honorarios_pct,
          notes: c.notes,
          created_by: profile.id
        };
      })
      .filter(Boolean);
    
    if (conceptosToInsert.length > 0) {
      const { error: conceptosError } = await supabase
        .from('planning_conceptos')
        .insert(conceptosToInsert);
      
      if (conceptosError) throw conceptosError;
    }
  }
}

/**
 * Calcular delta entre presupuesto actual y plantilla (versión simple)
 */
export function calculateDelta(
  currentPartidas: any[],
  currentConceptos: any[],
  template: TemplateData
) {
  const existingPartidaNames = new Set(currentPartidas.map(p => p.name));
  const existingConceptoCodes = new Set(currentConceptos.map(c => c.code));
  
  const newPartidas = template.partidas.filter(
    p => !existingPartidaNames.has(p.name)
  );
  
  const newConceptos = template.conceptos.filter(
    c => !existingConceptoCodes.has(c.code)
  );
  
  const existingConceptos = template.conceptos.filter(
    c => existingConceptoCodes.has(c.code)
  );
  
  return { newPartidas, newConceptos, existingConceptos };
}
