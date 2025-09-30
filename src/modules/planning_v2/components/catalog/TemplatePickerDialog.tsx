/**
 * Template Picker Dialog - Select and import concepts from templates
 */
import { useState, useMemo } from 'react';
import { Search, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createConcepto } from '../../services/budgetService';
import type { PlanningPartida } from '../../types';

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partidas: PlanningPartida[];
  budgetId: string;
  onSuccess: () => void;
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  partidas,
  budgetId,
  onSuccess,
}: TemplatePickerDialogProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [targetPartidaId, setTargetPartidaId] = useState<string>('');

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['planning-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_templates' as any)
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch template items
  const { data: templateItems = [] } = useQuery({
    queryKey: ['planning-template-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_template_items' as any)
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data as any[];
    },
    enabled: templates.length > 0,
  });

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates;
    
    const term = searchTerm.toLowerCase();
    return templates.filter((template) => {
      const matchesName = template.name.toLowerCase().includes(term);
      const matchesCategory = template.category?.toLowerCase().includes(term);
      const hasMatchingItems = templateItems
        .filter((item) => item.template_id === template.id)
        .some((item) => 
          item.short_description.toLowerCase().includes(term) ||
          item.code?.toLowerCase().includes(term)
        );
      
      return matchesName || matchesCategory || hasMatchingItems;
    });
  }, [templates, templateItems, searchTerm]);

  // Group items by template
  const itemsByTemplate = useMemo(() => {
    const groups = new Map<string, any[]>();
    templateItems.forEach((item) => {
      const items = groups.get(item.template_id) || [];
      items.push(item);
      groups.set(item.template_id, items);
    });
    return groups;
  }, [templateItems]);

  const toggleTemplate = (templateId: string) => {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllInTemplate = (templateId: string) => {
    const items = itemsByTemplate.get(templateId) || [];
    setSelectedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item) => next.add(item.id));
      return next;
    });
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!targetPartidaId) {
        throw new Error('Debe seleccionar una partida destino');
      }

      const itemsToImport = templateItems.filter((item) =>
        selectedItems.has(item.id)
      );

      if (itemsToImport.length === 0) {
        throw new Error('Debe seleccionar al menos un concepto');
      }

      // Get max order_index in target partida
      const { data: existingConceptos } = await supabase
        .from('planning_conceptos')
        .select('order_index')
        .eq('partida_id', targetPartidaId)
        .order('order_index', { ascending: false })
        .limit(1);

      let nextOrderIndex =
        existingConceptos && existingConceptos.length > 0
          ? existingConceptos[0].order_index + 1
          : 0;

      // Import each item
      for (const item of itemsToImport) {
        await createConcepto({
          partida_id: targetPartidaId,
          code: item.code || null,
          short_description: item.short_description,
          long_description: item.long_description || null,
          unit: item.unit,
          provider: item.provider || null,
          order_index: nextOrderIndex++,
          active: true,
          sumable: true,
          cantidad_real: item.cantidad_real || 0,
          desperdicio_pct: item.desperdicio_pct || 0,
          cantidad: 0,
          precio_real: item.precio_real || 0,
          honorarios_pct: item.honorarios_pct || 0,
          pu: 0,
          total_real: 0,
          total: 0,
          wbs_code: null,
          is_postventa: false,
          change_reason: null,
          props: item.props || {},
        });
      }

      return itemsToImport.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      toast.success(`${count} conceptos agregados desde plantilla`);
      setSelectedItems(new Set());
      setTargetPartidaId('');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al importar conceptos');
    },
  });

  const handleImport = () => {
    importMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Agregar desde Plantilla</DialogTitle>
          <DialogDescription>
            Selecciona conceptos de plantillas existentes para agregarlos a tu presupuesto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas o conceptos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Templates and Items */}
          <ScrollArea className="h-[400px] border rounded-lg">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Cargando plantillas...
                </p>
              ) : filteredTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No se encontraron plantillas
                </p>
              ) : (
                filteredTemplates.map((template) => {
                  const items = itemsByTemplate.get(template.id) || [];
                  const isExpanded = expandedTemplates.has(template.id);
                  const selectedCount = items.filter((item) =>
                    selectedItems.has(item.id)
                  ).length;

                  return (
                    <div key={template.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTemplate(template.id)}
                          className="p-0 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {template.description}
                            </p>
                          )}
                        </div>

                        {template.category && (
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        )}

                        <Badge variant="secondary" className="text-xs">
                          {items.length} conceptos
                        </Badge>

                        {selectedCount > 0 && (
                          <Badge className="text-xs">
                            {selectedCount} seleccionados
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectAllInTemplate(template.id)}
                          className="text-xs"
                        >
                          Seleccionar todos
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="p-2 space-y-1">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded"
                            >
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {item.code && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {item.code}
                                    </span>
                                  )}
                                  <span className="text-sm">{item.short_description}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{item.unit}</span>
                                  <span>•</span>
                                  <span>${item.precio_real?.toFixed(2) || '0.00'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Target Selection */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Partida Destino *</Label>
              <Select value={targetPartidaId} onValueChange={setTargetPartidaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona partida..." />
                </SelectTrigger>
                <SelectContent>
                  {partidas.map((partida) => (
                    <SelectItem key={partida.id} value={partida.id}>
                      {partida.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 w-full">
            <p className="text-sm text-muted-foreground flex-1">
              {selectedItems.size} concepto(s) seleccionado(s)
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedItems.size === 0 || !targetPartidaId || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Importando...
                </>
              ) : (
                `Agregar ${selectedItems.size} concepto(s)`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
