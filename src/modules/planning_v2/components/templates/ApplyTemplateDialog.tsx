/**
 * Diálogo para aplicar plantilla a presupuesto con preview y TU mapping
 */
import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as templateService from '../../services/templateService';
import { mapTemplateToTU } from '../../services/tuMappingService';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import type { BudgetTemplate } from '../../services/templateService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
}

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  preselectedTemplateId?: string;
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  budgetId,
  preselectedTemplateId
}: ApplyTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(preselectedTemplateId || '');
  const [showPreview, setShowPreview] = useState(false);
  const [mappingResults, setMappingResults] = useState<any>(null);
  const [isMapping, setIsMapping] = useState(false);

  // Update selectedTemplateId when preselectedTemplateId changes
  useEffect(() => {
    if (preselectedTemplateId) {
      setSelectedTemplateId(preselectedTemplateId);
    }
  }, [preselectedTemplateId]);

  // Fetch templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['planning-templates'],
    queryFn: templateService.getTemplates
  });

  // Fetch selected template
  const { data: selectedTemplate, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ['planning-template', selectedTemplateId],
    queryFn: () => templateService.getTemplate(selectedTemplateId),
    enabled: !!selectedTemplateId
  });
  
  // Get budget defaults
  const { data: budget } = useQuery({
    queryKey: ['planning-budget-settings', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_budgets')
        .select('settings')
        .eq('id', budgetId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    
    setIsMapping(true);
    try {
      const mapping = await mapTemplateToTU(
        selectedTemplate.template_data.partidas,
        selectedTemplate.template_data.conceptos
      );
      setMappingResults(mapping);
      setShowPreview(true);
    } catch (error: any) {
      console.error('Error mapping to TU:', error);
      toast.error('Error al mapear con TU');
    } finally {
      setIsMapping(false);
    }
  };

  // Apply template mutation with budget defaults
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error('No template selected');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Usuario no autenticado');
      
      const budgetSettings = (budget?.settings || {}) as any;
      const defaultHonorarios = budgetSettings.honorarios_pct_default ?? 0.17;
      const defaultDesperdicio = budgetSettings.desperdicio_pct_default ?? 0.05;

      // 1. Create partidas
      const partidasToInsert = selectedTemplate.template_data.partidas.map((p, idx) => ({
        budget_id: budgetId,
        name: p.name,
        order_index: idx,
        active: true,
        notes: null,
        honorarios_pct_override: null,
        desperdicio_pct_override: null,
      }));
      
      const { data: createdPartidas, error: partidasError } = await supabase
        .from('planning_partidas')
        .insert(partidasToInsert)
        .select();

      if (partidasError) throw new Error(`Error al crear partidas: ${partidasError.message}`);

      // 2. Build partida code to ID map
      const partidaCodeToId = new Map(
        selectedTemplate.template_data.partidas.map((p, idx) => [
          p.code,
          createdPartidas?.[idx]?.id
        ])
      );

      // 3. Create conceptos with defaults from budget
      const conceptosToInsert = selectedTemplate.template_data.conceptos
        .map((c, idx) => {
          const partidaId = partidaCodeToId.get(c.partida_code);
          if (!partidaId) return null;

          return {
            partida_id: partidaId,
            code: c.code,
            short_description: c.short_description,
            long_description: null,
            unit: c.unit,
            provider: null,
            order_index: idx,
            active: true,
            sumable: true,
            cantidad_real: 0, // Start at 0 as specified
            desperdicio_pct: c.desperdicio_pct > 0 ? c.desperdicio_pct : defaultDesperdicio,
            cantidad: 0,
            precio_real: c.precio_real,
            honorarios_pct: c.honorarios_pct > 0 ? c.honorarios_pct : defaultHonorarios,
            pu: 0,
            total_real: 0,
            total: 0,
            wbs_code: c.code,
            props: {
              template_import: {
                template_id: selectedTemplateId,
                template_name: selectedTemplate.name,
              }
            },
          };
        })
        .filter(Boolean);

      if (conceptosToInsert.length > 0) {
        const { error: conceptosError } = await supabase
          .from('planning_conceptos')
          .insert(conceptosToInsert);

        if (conceptosError) throw new Error(`Error al crear conceptos: ${conceptosError.message}`);
      }

      return {
        partidasCreated: createdPartidas?.length || 0,
        conceptosCreated: conceptosToInsert.length
      };
    },
    onSuccess: (result) => {
      toast.success(
        `Plantilla aplicada: ${result.partidasCreated} partidas y ${result.conceptosCreated} conceptos creados`
      );

      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      setShowPreview(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error applying template:', error);
      toast.error(error.message || 'Error al aplicar plantilla');
    }
  });

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aplicar Plantilla</DialogTitle>
            <DialogDescription>
              Selecciona una plantilla para prellenar el presupuesto. Los conceptos se crearán con cantidad en 0.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={isLoadingTemplates || applyMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingTemplates 
                      ? "Cargando plantillas..." 
                      : templates.length === 0 
                        ? "No hay plantillas disponibles"
                        : "Seleccionar plantilla..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No hay plantillas disponibles.
                      <br />
                      Sube una plantilla primero.
                    </div>
                  ) : (
                    templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {template.name}
                          {template.is_main && (
                            <span className="text-xs text-primary">(Principal)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.metadata.total_partidas} partidas, {selectedTemplate.metadata.total_conceptos} conceptos
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isMapping || applyMutation.isPending}
              >
                Cancelar
              </Button>

              <Button
                onClick={handlePreview}
                disabled={!selectedTemplateId || isLoadingTemplate || isMapping || applyMutation.isPending}
              >
                {isMapping ? 'Analizando...' : 'Vista Previa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Preview Dialog */}
      {selectedTemplate && mappingResults && (
        <TemplatePreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          onConfirm={() => applyMutation.mutate()}
          templateName={selectedTemplate.name}
          partidas={selectedTemplate.template_data.partidas}
          conceptos={selectedTemplate.template_data.conceptos}
          unmappedPartidas={mappingResults.unmappedPartidas}
          unmappedConceptos={mappingResults.unmappedConceptos}
          isApplying={applyMutation.isPending}
        />
      )}
    </>
  );
}
