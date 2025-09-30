/**
 * Concepto Edit Panel - Side panel for editing concepto details
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Upload, FileText, Clock, Save, Eye, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { updateConcepto } from '../../services/budgetService';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PlanningConcepto } from '../../types';
import { TUBreadcrumb } from './TUBreadcrumb';
import ReactMarkdown from 'react-markdown';

interface ConceptoEditPanelProps {
  concepto: PlanningConcepto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ConceptoEditPanel({
  concepto,
  open,
  onOpenChange,
  onSave,
}: ConceptoEditPanelProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm({
    defaultValues: {
      code: '',
      short_description: '',
      long_description: '',
      unit: '',
      provider: '',
      cantidad_real: 0,
      desperdicio_pct: 0,
      precio_real: 0,
      honorarios_pct: 0,
      notes: '',
    },
  });

  // Reset form when concepto changes
  useEffect(() => {
    if (concepto) {
      reset({
        code: concepto.code || '',
        short_description: concepto.short_description,
        long_description: concepto.long_description || '',
        unit: concepto.unit,
        provider: concepto.provider || '',
        cantidad_real: concepto.cantidad_real,
        desperdicio_pct: concepto.desperdicio_pct,
        precio_real: concepto.precio_real,
        honorarios_pct: concepto.honorarios_pct,
        notes: concepto.props?.notes || '',
      });
    }
  }, [concepto, reset]);

  // Auto-save with 1s debounce
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (values: any) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (concepto?.id) {
            setIsSaving(true);
            updateConcepto(concepto.id, {
              ...values,
              props: { ...concepto.props, notes: values.notes },
            })
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ['planning-budget'] });
                setIsSaving(false);
              })
              .catch(() => {
                toast.error('Error al guardar');
                setIsSaving(false);
              });
          }
        }, 1000);
      };
    })(),
    [concepto, queryClient]
  );

  // Watch for changes and trigger auto-save
  useEffect(() => {
    const subscription = watch((values) => {
      if (concepto && open) {
        debouncedSave(values);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedSave, concepto, open]);

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: ['concepto-attachments', concepto?.id],
    queryFn: async () => {
      if (!concepto?.id) return [];
      
      const { data, error } = await supabase
        .from('planning_concepto_attachments')
        .select('*')
        .eq('concepto_id', concepto.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!concepto?.id,
  });

  // Fetch audit history
  const { data: auditHistory = [] } = useQuery({
    queryKey: ['concepto-audit', concepto?.id],
    queryFn: async () => {
      if (!concepto?.id) return [];
      
      const { data, error } = await supabase
        .from('planning_audit_log')
        .select('*, profiles(full_name)')
        .eq('entity_type', 'concepto')
        .eq('entity_id', concepto.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!concepto?.id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!concepto?.id) return;
      return updateConcepto(concepto.id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-budget'] });
      toast.success('Concepto actualizado');
      onSave();
    },
    onError: () => {
      toast.error('Error al actualizar concepto');
    },
  });

  // File upload handler (only PDF, JPG, PNG)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !concepto?.id) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG');
      return;
    }

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe exceder 10 MB');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `conceptos/${concepto.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('planning_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { error: insertError } = await supabase
        .from('planning_concepto_attachments')
        .insert({
          concepto_id: concepto.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['concepto-attachments', concepto.id] });
      toast.success('Archivo adjuntado');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('planning_attachments')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from('planning_concepto_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ['concepto-attachments', concepto?.id] });
      toast.success('Archivo eliminado');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Error al eliminar archivo');
    }
  };

  // Download attachment
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('planning_attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error al descargar archivo');
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-save handles this now
  };

  if (!concepto) return null;

  // Computed values
  const cantidad = concepto.cantidad;
  const pu = concepto.pu;
  const total = concepto.total;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Editar Concepto</SheetTitle>
              <SheetDescription>
                {concepto.short_description}
              </SheetDescription>
            </div>
            {isSaving && (
              <Badge variant="outline" className="ml-2">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Guardando...
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="attachments">
              Adjuntos ({attachments.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Historial ({auditHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <form onSubmit={onSubmit} className="space-y-6 pr-4">
                {/* TU Breadcrumb (Read-only) */}
                <div className="space-y-2">
                  <Label>Ruta TU (Solo lectura)</Label>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <TUBreadcrumb conceptoId={concepto.id} />
                  </div>
                </div>

                <Separator />

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input id="code" {...register('code')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad</Label>
                    <Input id="unit" {...register('unit')} />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="short_description">Descripción Corta</Label>
                    <Input id="short_description" {...register('short_description')} />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="provider">Proveedor</Label>
                    <Input id="provider" {...register('provider')} />
                  </div>
                </div>

                <Separator />

                {/* Numeric Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cantidad_real">Cantidad Real</Label>
                    <Input
                      id="cantidad_real"
                      type="number"
                      step="0.000001"
                      {...register('cantidad_real', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desperdicio_pct">% Desperdicio</Label>
                    <Input
                      id="desperdicio_pct"
                      type="number"
                      step="0.01"
                      {...register('desperdicio_pct', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="precio_real">Precio Real</Label>
                    <Input
                      id="precio_real"
                      type="number"
                      step="0.01"
                      {...register('precio_real', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="honorarios_pct">% Honorarios</Label>
                    <Input
                      id="honorarios_pct"
                      type="number"
                      step="0.01"
                      {...register('honorarios_pct', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <Separator />

                {/* Computed Fields (Read-only) */}
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Campos Computados (Solo lectura)
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Cantidad</Label>
                      <p className="text-sm font-medium">{toDisplayPrecision(cantidad)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">PU</Label>
                      <p className="text-sm font-medium">{formatAsCurrency(pu)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Total</Label>
                      <p className="text-sm font-medium">{formatAsCurrency(total)}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Long Description (Markdown) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="long_description">
                      Descripción Larga (Markdown)
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showMarkdownPreview ? 'Editar' : 'Vista Previa'}
                    </Button>
                  </div>
                  {showMarkdownPreview ? (
                    <div className="prose prose-sm max-w-none border rounded-md p-4 min-h-[150px] bg-muted/30">
                      <ReactMarkdown>
                        {watch('long_description') || '*Sin descripción*'}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <Textarea
                      id="long_description"
                      {...register('long_description')}
                      rows={6}
                      placeholder="Soporta **negritas**, *cursivas*, y listas:&#10;- Item 1&#10;- Item 2"
                    />
                  )}
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    placeholder="Notas adicionales para el concepto..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="attachments" className="mt-6">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-4 pr-4">
                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {uploading ? 'Subiendo archivo...' : 'Click para adjuntar cotización (PDF, JPG, PNG)'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo 10 MB
                      </p>
                    </div>
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  {attachments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay archivos adjuntos
                    </p>
                  ) : (
                    attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {attachment.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.file_size / 1024).toFixed(1)} KB • {' '}
                              {new Date(attachment.created_at).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                          >
                            Descargar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('¿Eliminar este archivo?')) {
                                handleDeleteAttachment(attachment.id, attachment.file_path);
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-3 pr-4">
                {auditHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay historial de cambios
                  </p>
                ) : (
                  auditHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex gap-3 p-3 border rounded-lg"
                    >
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {entry.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString('es-MX')}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {entry.profiles?.full_name || 'Usuario'}
                        </p>
                        {entry.field_name && (
                          <div className="text-sm space-y-1 mt-2">
                            <p className="text-muted-foreground">
                              Campo: <span className="font-medium text-foreground">{entry.field_name}</span>
                            </p>
                            {entry.old_value && (
                              <p className="text-muted-foreground">
                                Antes: <span className="text-foreground">{entry.old_value}</span>
                              </p>
                            )}
                            {entry.new_value && (
                              <p className="text-muted-foreground">
                                Después: <span className="text-foreground">{entry.new_value}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
