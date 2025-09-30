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
 * Parsear archivo Excel CAMM a estructura de plantilla
 */
export async function parseCAMMExcel(file: File): Promise<TemplateData> {
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
          
          const partidas: TemplatePartida[] = [];
          const conceptos: TemplateConcepto[] = [];
          
          let currentPartida: string | null = null;
          let partidaOrder = 0;
          
          // Saltar encabezados (primeras 11 filas según el documento)
          for (let i = 12; i < rows.length; i++) {
            const row = rows[i];
            
            if (!row || row.length === 0) continue;
            
            const firstCol = String(row[0] || '').trim();
            const secondCol = String(row[1] || '').trim();
            
            // Detectar partida (formato: "1. Preliminares")
            if (firstCol.match(/^\d+\.\s+/)) {
              const partidaName = firstCol;
              const partidaCode = `P${firstCol.match(/^\d+/)?.[0]?.padStart(2, '0')}`;
              
              partidas.push({
                code: partidaCode,
                name: partidaName,
                order: partidaOrder++
              });
              
              currentPartida = partidaCode;
              continue;
            }
            
            // Detectar concepto (formato: "pr.01", "al.03", etc.)
            if (firstCol.match(/^[a-z]{2,4}\.\d+$/i)) {
              const conceptCode = firstCol.toLowerCase();
              
              if (!currentPartida) continue;
              
              conceptos.push({
                partida_code: currentPartida,
                code: conceptCode,
                short_description: secondCol || '',
                unit: String(row[2] || '').trim(),
                cantidad_real: parseNumber(row[3]),
                desperdicio_pct: parsePercentage(row[4]),
                precio_real: parseNumber(row[6]),
                honorarios_pct: parsePercentage(row[7]),
                notes: ''
              });
            }
          }
          
          resolve({ partidas, conceptos });
        } catch (error) {
          console.error('Error parsing Excel:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsBinaryString(file);
    });
}

/**
 * Parsear número desde Excel
 */
export function parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const cleaned = String(value).replace(/[$\s,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parsear porcentaje desde Excel (ej: "17%" o 0.17)
 */
export function parsePercentage(value: any): number {
    if (typeof value === 'number') {
      // Si es decimal (0.17), convertir a porcentaje
      return value < 1 ? value * 100 : value;
    }
    
    if (!value) return 0;
    
    const str = String(value).replace('%', '').trim();
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
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
