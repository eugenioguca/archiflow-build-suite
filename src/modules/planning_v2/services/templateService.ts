/**
 * Template Service - Planning v2
 * 
 * CRUD operations for templates and applying templates to budgets
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  PlanningTemplate,
  PlanningTemplateField,
  PlanningTemplatePartida,
  PlanningTemplateConcepto,
  TemplateDelta,
  PlanningBudget,
  PlanningPartida,
  PlanningConcepto
} from '../types';

// ==================== CRUD Operations ====================

export async function getTemplates() {
  const { data, error } = await supabase
    .from('planning_templates')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return (data || []) as unknown as PlanningTemplate[];
}

export async function getTemplateById(templateId: string) {
  const { data, error } = await supabase
    .from('planning_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  if (error) throw error;
  return data as unknown as PlanningTemplate;
}

export async function createTemplate(template: {
  name: string;
  description?: string;
  department?: string;
  settings?: Record<string, any>;
}) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  const { data, error } = await supabase
    .from('planning_templates')
    .insert({
      ...template,
      created_by: profile?.id,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as unknown as PlanningTemplate;
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<PlanningTemplate>
) {
  const { data, error } = await supabase
    .from('planning_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();
  
  if (error) throw error;
  return data as unknown as PlanningTemplate;
}

export async function deleteTemplate(templateId: string) {
  const { error } = await supabase
    .from('planning_templates')
    .delete()
    .eq('id', templateId);
  
  if (error) throw error;
}

// ==================== Template Fields ====================

export async function getTemplateFields(templateId: string) {
  const { data, error } = await supabase
    .from('planning_template_fields')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index');
  
  if (error) throw error;
  return (data || []) as unknown as PlanningTemplateField[];
}

export async function upsertTemplateField(field: Omit<PlanningTemplateField, 'id' | 'created_at'> & { id?: string }) {
  const { data, error } = await supabase
    .from('planning_template_fields')
    .upsert(field as any)
    .select()
    .single();
  
  if (error) throw error;
  return data as unknown as PlanningTemplateField;
}

export async function deleteTemplateField(fieldId: string) {
  const { error } = await supabase
    .from('planning_template_fields')
    .delete()
    .eq('id', fieldId);
  
  if (error) throw error;
}

// ==================== Template Partidas ====================

export async function getTemplatePartidas(templateId: string) {
  const { data, error } = await supabase
    .from('planning_template_partidas')
    .select('*')
    .eq('template_id', templateId)
    .order('order_index');
  
  if (error) throw error;
  return data as PlanningTemplatePartida[];
}

export async function upsertTemplatePartida(
  partida: Omit<PlanningTemplatePartida, 'id' | 'created_at'> & { id?: string }
) {
  const { data, error } = await supabase
    .from('planning_template_partidas')
    .upsert(partida)
    .select()
    .single();
  
  if (error) throw error;
  return data as PlanningTemplatePartida;
}

export async function deleteTemplatePartida(partidaId: string) {
  const { error } = await supabase
    .from('planning_template_partidas')
    .delete()
    .eq('id', partidaId);
  
  if (error) throw error;
}

// ==================== Template Conceptos ====================

export async function getTemplateConceptos(templatePartidaId: string) {
  const { data, error } = await supabase
    .from('planning_template_conceptos')
    .select('*')
    .eq('template_partida_id', templatePartidaId)
    .order('order_index');
  
  if (error) throw error;
  return data as PlanningTemplateConcepto[];
}

export async function getTemplateConceptosByTemplate(templateId: string) {
  const { data: partidas } = await supabase
    .from('planning_template_partidas')
    .select('id')
    .eq('template_id', templateId);

  if (!partidas || partidas.length === 0) return [];

  const { data, error } = await supabase
    .from('planning_template_conceptos')
    .select('*')
    .in('template_partida_id', partidas.map(p => p.id))
    .order('order_index');
  
  if (error) throw error;
  return data as PlanningTemplateConcepto[];
}

export async function upsertTemplateConcepto(
  concepto: Omit<PlanningTemplateConcepto, 'id' | 'created_at'> & { id?: string }
) {
  const { data, error } = await supabase
    .from('planning_template_conceptos')
    .upsert(concepto)
    .select()
    .single();
  
  if (error) throw error;
  return data as PlanningTemplateConcepto;
}

export async function deleteTemplateConcepto(conceptoId: string) {
  const { error } = await supabase
    .from('planning_template_conceptos')
    .delete()
    .eq('id', conceptoId);
  
  if (error) throw error;
}

// ==================== Apply Template ====================

export async function calculateTemplateDelta(
  templateId: string,
  budgetId: string
): Promise<TemplateDelta> {
  // Get template data
  const [templatePartidas, templateConceptos, templateFields] = await Promise.all([
    getTemplatePartidas(templateId),
    getTemplateConceptosByTemplate(templateId),
    getTemplateFields(templateId)
  ]);

  // Get existing budget data
  const { data: existingPartidas } = await supabase
    .from('planning_partidas')
    .select('*, planning_conceptos(*)')
    .eq('budget_id', budgetId);

  const delta: TemplateDelta = {
    partidas_to_add: [],
    conceptos_to_add: [],
    fields_to_add: [],
    existing_conceptos_to_update: []
  };

  // Identify partidas to add
  const existingPartidaNames = new Set(
    existingPartidas?.map(p => p.name.toLowerCase()) || []
  );

  templatePartidas.forEach(tp => {
    if (!existingPartidaNames.has(tp.name.toLowerCase())) {
      delta.partidas_to_add.push(tp);
    }
  });

  // Identify conceptos to add (matching by short_description)
  const existingConceptoDescs = new Set(
    existingPartidas?.flatMap(p => 
      (p.planning_conceptos as any[] || []).map(c => c.short_description.toLowerCase())
    ) || []
  );

  templateConceptos.forEach(tc => {
    const templatePartida = templatePartidas.find(p => p.id === tc.template_partida_id);
    if (templatePartida && !existingConceptoDescs.has(tc.short_description.toLowerCase())) {
      delta.conceptos_to_add.push({
        partida_name: templatePartida.name,
        concepto: tc
      });
    }
  });

  // Fields to add (all template fields are considered new for now)
  delta.fields_to_add = templateFields;

  return delta;
}

export async function applyTemplate(
  templateId: string,
  budgetId: string,
  delta: TemplateDelta
) {
  // Create new partidas
  const newPartidas: Record<string, string> = {};
  
  for (const tp of delta.partidas_to_add) {
    const { data: existingPartida } = await supabase
      .from('planning_partidas')
      .select('id')
      .eq('budget_id', budgetId)
      .eq('name', tp.name)
      .single();

    if (existingPartida) {
      newPartidas[tp.name] = existingPartida.id;
    } else {
      const { data: newPartida } = await supabase
        .from('planning_partidas')
        .insert({
          budget_id: budgetId,
          name: tp.name,
          order_index: tp.order_index,
          notes: tp.notes
        })
        .select('id')
        .single();
      
      if (newPartida) {
        newPartidas[tp.name] = newPartida.id;
      }
    }
  }

  // Create new conceptos
  for (const conceptoToAdd of delta.conceptos_to_add) {
    const partidaId = newPartidas[conceptoToAdd.partida_name];
    if (!partidaId) {
      // Find existing partida
      const { data: existingPartida } = await supabase
        .from('planning_partidas')
        .select('id')
        .eq('budget_id', budgetId)
        .eq('name', conceptoToAdd.partida_name)
        .single();
      
      if (!existingPartida) continue;
      newPartidas[conceptoToAdd.partida_name] = existingPartida.id;
    }

    const tc = conceptoToAdd.concepto;
    await supabase
      .from('planning_conceptos')
      .insert({
        partida_id: newPartidas[conceptoToAdd.partida_name],
        code: tc.code,
        short_description: tc.short_description,
        long_description: tc.long_description,
        unit: tc.unit,
        provider: tc.provider,
        order_index: tc.order_index,
        sumable: tc.sumable,
        active: true,
        // Apply default values from template
        cantidad_real: Number(tc.default_values.cantidad_real || 0),
        desperdicio_pct: Number(tc.default_values.desperdicio_pct || 0),
        precio_real: Number(tc.default_values.precio_real || 0),
        honorarios_pct: Number(tc.default_values.honorarios_pct || 0),
        // Computed fields will be calculated by triggers/formulas
        cantidad: 0,
        pu: 0,
        total_real: 0,
        total: 0,
        props: tc.default_values
      });
  }

  // Update existing conceptos if needed
  for (const update of delta.existing_conceptos_to_update) {
    await supabase
      .from('planning_conceptos')
      .update(update.updates)
      .eq('id', update.concepto_id);
  }
}
