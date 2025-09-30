/**
 * Dialog to create a template from current budget
 */
import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { saveTemplate } from '../../services/templateService';
import type { TemplateData } from '../../services/templateService';
import { useQueryClient } from '@tanstack/react-query';

interface CreateTemplateFromBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
}

export function CreateTemplateFromBudgetDialog({
  open,
  onOpenChange,
  budgetId,
  budgetName
}: CreateTemplateFromBudgetDialogProps) {
  const queryClient = useQueryClient();
  const [templateName, setTemplateName] = useState(`Plantilla: ${budgetName}`);
  const [description, setDescription] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleClose = () => {
    setTemplateName(`Plantilla: ${budgetName}`);
    setDescription('');
    setIsMain(false);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!templateName.trim()) {
      toast.error('El nombre de la plantilla es requerido');
      return;
    }

    setIsCreating(true);
    try {
      // Fetch partidas and conceptos from budget
      const { data: partidas, error: partidasError } = await supabase
        .from('planning_partidas')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('active', true)
        .order('order_index');

      if (partidasError) throw partidasError;

      const { data: conceptos, error: conceptosError } = await supabase
        .from('planning_conceptos')
        .select('*')
        .eq('active', true)
        .order('order_index');

      if (conceptosError) throw conceptosError;

      // Filter conceptos by partidas in this budget
      const partidaIds = new Set(partidas?.map(p => p.id) || []);
      const filteredConceptos = conceptos?.filter(c => partidaIds.has(c.partida_id)) || [];

      // Build template structure
      const templateData: TemplateData = {
        partidas: (partidas || []).map((p, idx) => ({
          code: `P${String(idx + 1).padStart(2, '0')}`,
          name: p.name,
          order: p.order_index
        })),
        conceptos: filteredConceptos.map(c => {
          // Find partida index to build partida_code
          const partidaIndex = partidas?.findIndex(p => p.id === c.partida_id) ?? -1;
          const partidaCode = partidaIndex >= 0 ? `P${String(partidaIndex + 1).padStart(2, '0')}` : 'P00';

          return {
            partida_code: partidaCode,
            code: c.code || `C${c.order_index}`,
            short_description: c.short_description,
            unit: c.unit,
            cantidad_real: c.cantidad_real,
            desperdicio_pct: c.desperdicio_pct,
            precio_real: c.precio_real,
            honorarios_pct: c.honorarios_pct,
            notes: c.long_description || ''
          };
        })
      };

      // Save template
      await saveTemplate(templateName, templateData, {
        description: description || undefined,
        isMain,
        sourceFile: `Budget: ${budgetName}`
      });

      toast.success(`Plantilla "${templateName}" creada exitosamente`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });

      handleClose();
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(`Error al crear plantilla: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Plantilla desde Presupuesto</DialogTitle>
          <DialogDescription>
            Crea una plantilla reutilizable a partir del presupuesto actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nombre de la Plantilla *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej: Construcción Residencial - Plantilla Base"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Descripción</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el propósito y alcance de esta plantilla..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-main" className="cursor-pointer">
              Marcar como Plantilla Principal
            </Label>
            <Switch
              id="is-main"
              checked={isMain}
              onCheckedChange={setIsMain}
              disabled={isCreating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !templateName.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Crear Plantilla
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
