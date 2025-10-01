/**
 * Concepto Edit Panel - Side panel for editing concepto details
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { updateConcepto } from '../../services/budgetService';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PlanningConcepto } from '../../types';
import { TUBreadcrumb } from './TUBreadcrumb';
import ReactMarkdown from 'react-markdown';
import { SearchableCombobox, type SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { useSuppliers } from '../../hooks/useSuppliers';
import { AutoResizeTextarea } from '../ui/AutoResizeTextarea';

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
  const [supplierSearch, setSupplierSearch] = useState('');

  // Fetch suppliers
  const { data: suppliersData = [], isLoading: isLoadingSuppliers } = useSuppliers(supplierSearch);
  
  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm({
    defaultValues: {
      code: '',
      short_description: '',
      long_description: '',
      unit: '',
      provider_id: '',
      cantidad_real: 0,
      desperdicio_pct: 0,
      precio_real: 0,
      honorarios_pct: 0,
      notas_md: '',
      is_postventa: false,
      change_reason: '',
    },
  });

  // Transform suppliers to combobox items
  const suppliers: SearchableComboboxItem[] = useMemo(() => {
    return suppliersData.map((supplier) => ({
      value: supplier.id,
      label: supplier.company_name,
      codigo: supplier.rfc || '',
      searchText: `${supplier.company_name} ${supplier.rfc || ''}`,
    }));
  }, [suppliersData]);

  // Reset form when concepto changes
  useEffect(() => {
    if (concepto) {
      reset({
        code: concepto.code || '',
        short_description: concepto.short_description,
        long_description: concepto.long_description || '',
        unit: concepto.unit,
        provider_id: (concepto as any).provider_id || '',
        cantidad_real: concepto.cantidad_real,
        desperdicio_pct: concepto.desperdicio_pct,
        precio_real: concepto.precio_real,
        honorarios_pct: concepto.honorarios_pct,
        notas_md: (concepto as any).notas_md || '',
        is_postventa: concepto.is_postventa || false,
        change_reason: concepto.change_reason || '',
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
            updateConcepto(concepto.id, values)
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

  // Get current user profile
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // File upload handler (only PDF, JPG, PNG)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !concepto?.id || !currentProfile?.id) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF, JPG o PNG');
      event.target.value = '';
      return;
    }

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe exceder 10 MB');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { data: budget } = await supabase
        .from('planning_conceptos')
        .select('partida_id, planning_partidas(budget_id)')
        .eq('id', concepto.id)
        .single();

      const budgetId = (budget as any)?.planning_partidas?.budget_id;
      if (!budgetId) throw new Error('Budget ID not found');

      // Upload to storage with proper path structure
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${budgetId}/${concepto.id}/${timestamp}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('planning_v2_concept_attachments')
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
          created_by: currentProfile.id,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['concepto-attachments', concepto.id] });
      toast.success('Archivo adjuntado correctamente');
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: string, filePath: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('planning_v2_concept_attachments')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from('planning_concepto_attachments')
        .delete()
        .eq('id', attachmentId);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ['concepto-attachments', concepto?.id] });
      toast.success('Archivo eliminado correctamente');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Error al eliminar archivo');
    }
  };

  // Download attachment
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('planning_v2_concept_attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Archivo descargado');
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
                    <Label htmlFor="provider_id">Proveedor</Label>
                    <SearchableCombobox
                      items={suppliers}
                      value={watch('provider_id') || ''}
                      onValueChange={(value) => setValue('provider_id', value)}
                      placeholder="Seleccionar proveedor..."
                      searchPlaceholder="Buscar por nombre o RFC..."
                      emptyText="No se encontraron proveedores"
                      loading={isLoadingSuppliers}
                      showCodes={true}
                      searchFields={['label', 'codigo']}
                    />
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

                {/* Notas Markdown (large textarea) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notas_md">
                      Notas y Comentarios (Markdown)
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
                    <div className="prose prose-sm max-w-none border rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-muted/30 whitespace-pre-wrap break-words">
                      <ReactMarkdown>
                        {watch('notas_md') || '*Sin notas*'}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <AutoResizeTextarea
                      id="notas_md"
                      {...register('notas_md')}
                      minRows={4}
                      maxRows={12}
                      placeholder="Escribe notas largas aquí. Soporta Markdown:&#10;&#10;**Negritas**, *cursivas*&#10;&#10;- Lista 1&#10;- Lista 2&#10;&#10;Ideal para cotizaciones, comentarios técnicos, etc."
                      className="w-full"
                    />
                  )}
                </div>

                <Separator />

                {/* Post-venta Section */}
                <div className="space-y-4 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_postventa" className="text-base font-medium">
                        Post-venta
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Marcar si este concepto es un cambio post-venta
                      </p>
                    </div>
                    <Switch
                      id="is_postventa"
                      checked={watch('is_postventa')}
                      onCheckedChange={(checked) => setValue('is_postventa', checked)}
                    />
                  </div>

                  {watch('is_postventa') && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="change_reason">Motivo del Cambio *</Label>
                      <AutoResizeTextarea
                        id="change_reason"
                        {...register('change_reason')}
                        minRows={3}
                        maxRows={8}
                        placeholder="Describe el motivo del cambio post-venta..."
                        className="bg-background w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este motivo se incluirá en los reportes de post-venta
                      </p>
                    </div>
                  )}
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
                {/* Upload Section */}
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                      <div className="text-sm">
                        <span className="font-medium text-primary">Click para subir</span>
                        {' '}o arrastra archivos aquí
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG o PNG (máx. 10 MB)
                      </p>
                    </div>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo archivo...
                    </div>
                  )}
                </div>

                {/* Attachments List */}
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay archivos adjuntos</p>
                    <p className="text-xs mt-1">
                      Sube cotizaciones, fotos o documentos relacionados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {attachments.length} archivo{attachments.length !== 1 ? 's' : ''} adjunto{attachments.length !== 1 ? 's' : ''}
                    </p>
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {attachment.file_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>
                                {(attachment.file_size / 1024).toFixed(1)} KB
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(attachment.created_at).toLocaleDateString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                            title="Descargar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(attachment.id, attachment.file_path)}
                            className="hover:text-destructive"
                            title="Eliminar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-3 pr-4">
                {auditHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay historial de cambios</p>
                    <p className="text-xs mt-1">
                      Los cambios en precio, cantidad, proveedor y notas aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Historial de Cambios
                    </p>
                    {auditHistory.map((log) => (
                      <div
                        key={log.id}
                        className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {log.action_type === 'update' ? 'Actualización' : 
                                 log.action_type === 'create' ? 'Creación' : 
                                 log.action_type === 'delete' ? 'Eliminación' : 
                                 log.action_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {log.profiles?.full_name || 'Usuario desconocido'}
                              </span>
                            </div>
                            {log.description && (
                              <p className="text-sm mt-1 text-foreground">
                                {log.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        {/* Show change details if available */}
                        {log.changes && typeof log.changes === 'object' && (
                          <div className="text-xs bg-muted/50 rounded p-2 space-y-1 mt-2">
                            {Object.entries(log.changes as Record<string, any>).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground min-w-[100px]">
                                  {key}:
                                </span>
                                <span className="flex-1 break-all">
                                  {JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
