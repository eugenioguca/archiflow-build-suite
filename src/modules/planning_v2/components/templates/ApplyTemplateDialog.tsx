/**
 * Diálogo para aplicar plantilla a presupuesto con preview de cambios
 */
import { useState, useEffect } from 'react';
import { FileText, Plus, AlertCircle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import * as templateService from '../../services/templateService';
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
  const [delta, setDelta] = useState<any | null>(null);
  const [currentPartidas, setCurrentPartidas] = useState<any[]>([]);
  const [currentConceptos, setCurrentConceptos] = useState<any[]>([]);

  // Update selectedTemplateId when preselectedTemplateId changes
  useEffect(() => {
    if (preselectedTemplateId) {
      setSelectedTemplateId(preselectedTemplateId);
    }
  }, [preselectedTemplateId]);

  // Fetch current partidas and conceptos when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      const partidasResult = await (supabase as any)
        .from('planning_partidas')
        .select('*')
        .eq('budget_id', budgetId);
      
      const conceptosResult = await (supabase as any)
        .from('planning_conceptos')
        .select('*')
        .eq('budget_id', budgetId);
      
      setCurrentPartidas(partidasResult.data || []);
      setCurrentConceptos(conceptosResult.data || []);
    };

    fetchData();
  }, [open, budgetId]);

  // Fetch templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['planning-templates'],
    queryFn: templateService.getTemplates
  });

  // Fetch selected template
  const { data: selectedTemplate } = useQuery({
    queryKey: ['planning-template', selectedTemplateId],
    queryFn: () => templateService.getTemplate(selectedTemplateId),
    enabled: !!selectedTemplateId
  });

  // Calculate delta when template changes
  useEffect(() => {
    if (selectedTemplate?.template_data) {
      const calculatedDelta = templateService.calculateDelta(
        currentPartidas,
        currentConceptos,
        selectedTemplate.template_data
      );
      setDelta(calculatedDelta);
    } else {
      setDelta(null);
    }
  }, [selectedTemplate, currentPartidas, currentConceptos]);

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !delta) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('Usuario no autenticado');

      // 1. Crear nuevas partidas
      if (delta.newPartidas.length > 0) {
        const { error: partidasError } = await supabase
          .from('planning_partidas')
          .insert(
            delta.newPartidas.map(p => ({
              budget_id: budgetId,
              name: p.name,
              orden: p.order,
              created_by: profile.id
            }))
          );

        if (partidasError) throw partidasError;
      }

      // 2. Obtener mapping de nombres de partida a IDs
      const { data: allPartidas, error: partidasError } = await supabase
        .from('planning_partidas')
        .select('id, name')
        .eq('budget_id', budgetId);

      if (partidasError) throw partidasError;

      const partidaNameToId = new Map(
        allPartidas.map(p => [p.name, p.id])
      );

      // 3. Crear nuevos conceptos (con cantidad en 0)
      if (delta.newConceptos.length > 0) {
        const conceptsToInsert = delta.newConceptos
          .map(c => {
            // Buscar la partida por código primero
            const partida = delta.newPartidas.find(p => p.code === c.partida_code);
            const partidaId = partida ? partidaNameToId.get(partida.name) : null;
            if (!partidaId) return null;

            return {
              budget_id: budgetId,
              partida_id: partidaId,
              code: c.code,
              short_description: c.short_description,
              unit: c.unit,
              cantidad_real: 0, // Iniciar en 0
              desperdicio_pct: c.desperdicio_pct,
              precio_real: c.precio_real,
              honorarios_pct: c.honorarios_pct,
              notes: c.notes,
              sumable: true,
              active: true,
              created_by: profile.id
            };
          })
          .filter(Boolean);

        if (conceptsToInsert.length > 0) {
          const { error: conceptosError } = await supabase
            .from('planning_conceptos')
            .insert(conceptsToInsert);

          if (conceptosError) throw conceptosError;
        }
      }

      return {
        newPartidas: delta.newPartidas.length,
        newConceptos: delta.newConceptos.length
      };
    },
    onSuccess: (result) => {
      toast.success(
        `Plantilla aplicada: ${result?.newPartidas || 0} partidas y ${result?.newConceptos || 0} conceptos agregados`
      );

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['planning-partidas', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['planning-conceptos', budgetId] });

      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error applying template:', error);
      toast.error(`Error al aplicar plantilla: ${error.message}`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Aplicar Plantilla</DialogTitle>
          <DialogDescription>
            Seleccione una plantilla para prellenar el presupuesto. Los conceptos no utilizados se agregarán con cantidad en 0.
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
                <SelectValue placeholder="Seleccionar plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                      {template.is_main && (
                        <span className="text-xs text-primary">(Principal)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {delta && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Vista previa de cambios antes de aplicar la plantilla
                </AlertDescription>
              </Alert>

              <Tabs defaultValue="new" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new">
                    Elementos Nuevos ({delta.newPartidas.length + delta.newConceptos.length})
                  </TabsTrigger>
                  <TabsTrigger value="existing">
                    Ya Existentes ({delta.existingConceptos.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="space-y-4">
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-4">
                      {delta.newPartidas.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Nuevas Partidas ({delta.newPartidas.length})
                          </h4>
                          <div className="space-y-1">
                            {delta.newPartidas.map(p => (
                              <div key={p.code} className="text-sm flex items-center gap-2">
                                <Plus className="h-3 w-3 text-green-600" />
                                <span className="font-mono text-xs">{p.code}</span>
                                <span>{p.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {delta.newConceptos.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Nuevos Conceptos ({delta.newConceptos.length})
                          </h4>
                          <div className="space-y-1">
                            {delta.newConceptos.map(c => (
                              <div key={c.code} className="text-sm flex items-center gap-2">
                                <Plus className="h-3 w-3 text-green-600" />
                                <span className="font-mono text-xs">{c.code}</span>
                                <span className="flex-1 truncate">{c.short_description}</span>
                                <span className="text-xs text-muted-foreground">{c.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {delta.newPartidas.length === 0 && delta.newConceptos.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No hay elementos nuevos para agregar
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="existing">
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-1">
                      {delta.existingConceptos.length > 0 ? (
                        delta.existingConceptos.map(c => (
                          <div key={c.code} className="text-sm flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono text-xs">{c.code}</span>
                            <span className="flex-1 truncate">{c.short_description}</span>
                            <span className="text-xs">(ya existe)</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No hay elementos duplicados
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applyMutation.isPending}
            >
              Cancelar
            </Button>

            <Button
              onClick={() => applyMutation.mutate()}
              disabled={!selectedTemplateId || !delta || applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Aplicando...' : 'Aplicar Plantilla'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
