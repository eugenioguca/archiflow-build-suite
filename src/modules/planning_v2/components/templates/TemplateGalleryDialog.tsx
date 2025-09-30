/**
 * Template Gallery Dialog - Browse and select templates with preview
 */
import { useState, useMemo } from 'react';
import { Search, FileText, Package, List, Eye } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getTemplates } from '../../services/templateService';
import type { BudgetTemplate } from '../../services/templateService';

interface TemplateGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateGalleryDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateGalleryDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<BudgetTemplate | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['planning-templates'],
    queryFn: getTemplates,
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates;
    
    const term = searchTerm.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(term) ||
        template.description?.toLowerCase().includes(term)
    );
  }, [templates, searchTerm]);

  const handleSelect = (template: BudgetTemplate) => {
    onSelectTemplate(template.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Galería de Plantillas</DialogTitle>
          <DialogDescription>
            Explora y selecciona una plantilla para aplicar a tu presupuesto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* Templates List */}
            <div className="col-span-5">
              <ScrollArea className="h-[500px] border rounded-lg">
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
                    filteredTemplates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors hover:border-primary ${
                          previewTemplate?.id === template.id ? 'border-primary' : ''
                        }`}
                        onClick={() => setPreviewTemplate(template)}
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm">
                                {template.name}
                                {template.is_main && (
                                  <Badge variant="default" className="ml-2">
                                    Principal
                                  </Badge>
                                )}
                              </CardTitle>
                              {template.description && (
                                <CardDescription className="text-xs mt-1">
                                  {template.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>{template.metadata.total_partidas} partidas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <List className="h-3 w-3" />
                              <span>{template.metadata.total_conceptos} conceptos</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Preview Panel */}
            <div className="col-span-7">
              {previewTemplate ? (
                <Card className="h-[500px] flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          Vista Previa
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {previewTemplate.name}
                        </CardDescription>
                      </div>
                      <Button onClick={() => handleSelect(previewTemplate)}>
                        Seleccionar
                      </Button>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                      <div className="space-y-4">
                        {/* Metadata */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Información</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Partidas:</span>
                              <span className="ml-2 font-medium">
                                {previewTemplate.metadata.total_partidas}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Conceptos:</span>
                              <span className="ml-2 font-medium">
                                {previewTemplate.metadata.total_conceptos}
                              </span>
                            </div>
                            {previewTemplate.metadata.source_file && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Archivo origen:</span>
                                <span className="ml-2 text-xs font-mono">
                                  {previewTemplate.metadata.source_file}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Partidas Preview */}
                        {previewTemplate.template_data.partidas.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Partidas</h4>
                            <div className="space-y-1">
                              {previewTemplate.template_data.partidas.slice(0, 10).map((partida) => (
                                <div
                                  key={partida.code}
                                  className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm"
                                >
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {partida.code}
                                  </Badge>
                                  <span className="flex-1 truncate">{partida.name}</span>
                                </div>
                              ))}
                              {previewTemplate.template_data.partidas.length > 10 && (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  ... y {previewTemplate.template_data.partidas.length - 10} más
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <Separator />

                        {/* Conceptos Preview */}
                        {previewTemplate.template_data.conceptos.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Conceptos (muestra)</h4>
                            <div className="space-y-1">
                              {previewTemplate.template_data.conceptos.slice(0, 15).map((concepto) => (
                                <div
                                  key={concepto.code}
                                  className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs"
                                >
                                  <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                                    {concepto.code}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate">{concepto.short_description}</p>
                                    <p className="text-muted-foreground">
                                      {concepto.unit} • ${concepto.precio_real.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {previewTemplate.template_data.conceptos.length > 15 && (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  ... y {previewTemplate.template_data.conceptos.length - 15} más
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-[500px] border rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Selecciona una plantilla para ver su preview
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
