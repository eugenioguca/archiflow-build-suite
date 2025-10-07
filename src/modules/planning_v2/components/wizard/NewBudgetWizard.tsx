/**
 * Wizard de 3 pasos para crear presupuesto
 * Utiliza SearchableCombobox (estilo TU) para Cliente y Proyecto
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { SearchableCombobox, type SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { createBudget } from '../../services/budgetService';
import { projectsAdapter } from '../../adapters/projects';
import { clientsAdapter } from '../../adapters/clients';
import type { ProjectAdapter } from '../../adapters/projects';
import type { ClientAdapter } from '../../adapters/clients';
import { MayoresSelector } from './MayoresSelector';
import { useMayoresTU } from '@/hooks/gantt-v2/useMayoresTU';

const stepOneSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  project_id: z.string().uuid('Selecciona un proyecto válido').optional(),
  client_id: z.string().uuid('Selecciona un cliente válido').optional(),
  currency: z.string().default('MXN'),
  enable_iva: z.boolean().default(true),
  iva_rate: z.number().min(0).max(1).default(0.16),
  honorarios_pct_default: z.number().min(0).max(1).default(0.17),
  desperdicio_pct_default: z.number().min(0).max(1).default(0.05),
  notes: z.string().optional(),
}).refine((data) => data.project_id || data.client_id, {
  message: 'Debes seleccionar un proyecto o un cliente',
  path: ['client_id'],
});

type StepOneData = z.infer<typeof stepOneSchema>;

interface NewBudgetWizardProps {
  open: boolean;
  onClose: () => void;
}

export function NewBudgetWizard({ open, onClose }: NewBudgetWizardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedMayorIds, setSelectedMayorIds] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientAdapter | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectAdapter | null>(null);
  
  // Ref para el contenedor del Dialog - necesario para que el Popover se renderice dentro del Dialog
  const dialogContentRef = React.useRef<HTMLDivElement>(null);
  
  // Estados para comboboxes (estilo TU: cargar todo al abrir)
  const [clientes, setClientes] = useState<SearchableComboboxItem[]>([]);
  const [proyectos, setProyectos] = useState<SearchableComboboxItem[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  
  // Race-safety refs para handlers async
  const clientReqIdRef = useRef(0);
  const projectReqIdRef = useRef(0);

  // Cargar Mayores TU para mostrar nombres en resumen
  const { data: mayoresTU = [] } = useMayoresTU();

  const form = useForm<StepOneData>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      name: '',
      currency: 'MXN',
      enable_iva: true,
      iva_rate: 0.16,
      honorarios_pct_default: 0.17,
      desperdicio_pct_default: 0.05,
      notes: '',
    },
  });

  const handleClose = () => {
    form.reset();
    setStep(1);
    setSelectedMayorIds([]);
    setSelectedClient(null);
    setSelectedProject(null);
    onClose();
  };

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await form.trigger();
      if (isValid) setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const values = form.getValues();
      const budget = await createBudget({
        name: values.name,
        project_id: values.project_id || null,
        client_id: values.client_id || null,
        currency: values.currency,
        status: 'draft',
        settings: {
          source: 'TU',
          enable_iva: values.enable_iva,
          iva_rate: values.iva_rate,
          notes: values.notes || null,
          // Nueva estructura
          selected_majors: selectedMayorIds,
          defaults: {
            honorarios_pct: values.honorarios_pct_default,
            desperdicio_pct: values.desperdicio_pct_default,
            iva_pct: values.iva_rate,
          },
          // Mantener estructura antigua para compatibilidad
          honorarios_pct_default: values.honorarios_pct_default,
          desperdicio_pct_default: values.desperdicio_pct_default,
        },
      });

      // Invalidate queries to refresh budget list
      await queryClient.invalidateQueries({ queryKey: ['planning_v2', 'budgets'] });
      await queryClient.invalidateQueries({ queryKey: ['planning_v2'] });
      
      toast({ title: 'Presupuesto creado', description: `${budget.name} se creó correctamente` });
      handleClose();
      navigate(`/planning-v2/budgets/${budget.id}`);
    } catch (error: any) {
      toast({ title: 'Error al crear presupuesto', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes y proyectos al abrir (estilo TU)
  useEffect(() => {
    if (open) {
      loadClientes();
      loadProyectos();
    }
  }, [open]);

  const loadClientes = async () => {
    setLoadingClientes(true);
    try {
      const result = await clientsAdapter.getAll();
      const items: SearchableComboboxItem[] = result.map(c => ({
        value: c.id,
        label: c.full_name,
        codigo: c.id.slice(0, 8), // Usar primeros 8 chars como código visual
        searchText: `${c.id.slice(0, 8)} ${c.full_name}`.toLowerCase()
      }));
      setClientes(items);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast({ title: 'Error al cargar clientes', description: 'No se pudieron cargar los clientes', variant: 'destructive' });
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadProyectos = async () => {
    setLoadingProyectos(true);
    try {
      const result = await projectsAdapter.getAll();
      const items: SearchableComboboxItem[] = result.map(p => ({
        value: p.id,
        label: p.project_name,
        codigo: p.id.slice(0, 8),
        searchText: `${p.id.slice(0, 8)} ${p.project_name}`.toLowerCase(),
        // Guardamos el client_id en searchText de forma no visible para el filtrado
        group: p.client_id // Usamos group para guardar el client_id
      }));
      setProyectos(items);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      toast({ title: 'Error al cargar proyectos', description: 'No se pudieron cargar los proyectos', variant: 'destructive' });
    } finally {
      setLoadingProyectos(false);
    }
  };

  // Filtrar proyectos por cliente seleccionado
  const proyectosFiltrados = useMemo(() => {
    const clientId = form.watch('client_id');
    if (!clientId) return proyectos;
    
    return proyectos.filter(p => p.group === clientId);
  }, [proyectos, form.watch('client_id')]);

  // Handler race-safe para cambio de cliente (solo carga data, no modifica form)
  const handleClientChange = async (clientId: string | undefined) => {
    const reqId = ++clientReqIdRef.current;
    
    if (!clientId) {
      setSelectedClient(null);
      return;
    }

    try {
      const client = await clientsAdapter.getById(clientId);
      if (reqId !== clientReqIdRef.current) return; // Respuesta vieja
      setSelectedClient(client);

      // Validar proyecto actual
      const currentProjectId = form.getValues('project_id');
      if (currentProjectId) {
        const project = await projectsAdapter.getById(currentProjectId);
        if (reqId !== clientReqIdRef.current) return;
        if (project && project.client_id !== clientId) {
          form.setValue('project_id', undefined);
          setSelectedProject(null);
        }
      }
    } catch (error) {
      if (reqId !== clientReqIdRef.current) return;
      console.error('Error loading client:', error);
    }
  };

  // Handler race-safe para cambio de proyecto (solo carga data, auto-selecciona cliente)
  const handleProjectChange = async (projectId: string | undefined) => {
    const reqId = ++projectReqIdRef.current;
    
    if (!projectId) {
      setSelectedProject(null);
      return;
    }

    try {
      const project = await projectsAdapter.getById(projectId);
      if (reqId !== projectReqIdRef.current) return;
      setSelectedProject(project);
      
      if (project) {
        // Auto-seleccionar cliente del proyecto
        form.setValue('client_id', project.client_id);
        const client = await clientsAdapter.getById(project.client_id);
        if (reqId !== projectReqIdRef.current) return;
        setSelectedClient(client);
      }
    } catch (error) {
      if (reqId !== projectReqIdRef.current) return;
      console.error('Error loading project:', error);
    }
  };

  // useEffect para observar cambios en client_id y ejecutar side-effects async
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'client_id') {
        handleClientChange(value.client_id);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // useEffect para observar cambios en project_id y ejecutar side-effects async
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'project_id') {
        handleProjectChange(value.project_id);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Enhanced keyboard and scroll event handling for SearchableCombobox inside Dialog
  const handleDialogKeyDownCapture = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    
    // CRITICAL: Bypass ALL Dialog handling if within combobox
    if (target.closest('[data-combobox-root]')) {
      console.log('[Dialog] KeyDownCapture within combobox - bypassing Dialog handling:', e.key)
      console.log('[Dialog] activeElement:', document.activeElement?.tagName, document.activeElement?.className)
      return; // Let combobox handle this event naturally
    }
    
    // Normal Dialog handling for non-combobox events
    if (e.key === "Escape") {
      console.log('[Dialog] Escape pressed outside combobox - closing dialog')
    }
  }

  const handleDialogFocusCapture = (e: React.FocusEvent) => {
    const target = e.target as HTMLElement
    
    // CRITICAL: Bypass focus trap if within combobox
    if (target.closest('[data-combobox-root]')) {
      console.log('[Dialog] FocusCapture within combobox - bypassing focus trap')
      console.log('[Dialog] activeElement:', document.activeElement?.tagName, document.activeElement?.className)
      return; // Let combobox manage its own focus
    }
  }

  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    
    if (target.closest('[data-combobox-root]')) {
      console.log('[Dialog] KeyDown within combobox - bypassing all Dialog handling:', e.key)
      return; // Prevent Dialog from interfering
    }
    
    console.log('[Dialog] Handling dialog-specific event:', e.key)
  }

  const handleDialogWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement
    
    if (target.closest('[data-combobox-root]')) {
      console.log('[Dialog] Wheel within combobox - bypassing Dialog handling')
      return; // Let combobox handle scroll naturally
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Form {...form}>
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del presupuesto *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Ej: Casa Moderna - Presupuesto Mayo 2024"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <div data-combobox-root>
                        <SearchableCombobox
                          items={clientes}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Seleccionar cliente..."
                          searchPlaceholder="Buscar por nombre..."
                          emptyText="Sin resultados"
                          loading={loadingClientes}
                          disabled={loading}
                          showCodes={false}
                          searchFields={['label', 'searchText']}
                          className="w-full"
                          portalContainer={dialogContentRef.current}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Opcional. Selecciona un cliente o un proyecto.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyecto</FormLabel>
                    <FormControl>
                      <div data-combobox-root>
                        <SearchableCombobox
                          items={proyectosFiltrados}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Seleccionar proyecto..."
                          searchPlaceholder="Buscar por nombre..."
                          emptyText="Sin resultados"
                          loading={loadingProyectos}
                          disabled={loading}
                          showCodes={false}
                          searchFields={['label', 'searchText']}
                          className="w-full"
                          portalContainer={dialogContentRef.current}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {form.watch('client_id') 
                        ? 'Filtrado por cliente seleccionado.' 
                        : 'Opcional. Si eliges un cliente, filtraremos los proyectos.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">MXN - Peso mexicano</SelectItem>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable_iva">IVA</Label>
                  <Switch
                    id="enable_iva"
                    checked={form.watch('enable_iva')}
                    onCheckedChange={(checked) => form.setValue('enable_iva', checked)}
                  />
                </div>
                {form.watch('enable_iva') && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    {...form.register('iva_rate', { valueAsNumber: true })}
                    placeholder="0.16"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="honorarios_pct_default">% Honorarios (default)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...form.register('honorarios_pct_default', { valueAsNumber: true })}
                  placeholder="0.17"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desperdicio_pct_default">% Desperdicio (default)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  {...form.register('desperdicio_pct_default', { valueAsNumber: true })}
                  placeholder="0.05"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Notas adicionales sobre el presupuesto..."
                rows={3}
              />
            </div>
          </div>
          </Form>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-primary/5 border border-primary/10 rounded-lg">
              <p className="text-sm font-semibold mb-1">Estructura base (TU)</p>
              <p className="text-xs text-muted-foreground">
                Selecciona los Mayores del catálogo de Construcción. Las Partidas/Subpartidas se agregarán después en el Catálogo.
              </p>
            </div>

            <MayoresSelector
              selectedMayorIds={selectedMayorIds}
              onSelectionChange={setSelectedMayorIds}
              departamento="CONSTRUCCIÓN"
            />
            
            <p className="text-xs text-muted-foreground text-center">
              {selectedMayorIds.length === 0 
                ? 'Ningún Mayor seleccionado' 
                : `${selectedMayorIds.length} ${selectedMayorIds.length === 1 ? 'Mayor seleccionado' : 'Mayores seleccionados'}`}
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Resumen</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{form.watch('name')}</span>
              </div>
              {form.watch('project_id') && selectedProject && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Proyecto:</span>
                  <span className="font-medium">{selectedProject.project_name}</span>
                </div>
              )}
              {form.watch('client_id') && selectedClient && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedClient.full_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Moneda:</span>
                <span className="font-medium">{form.watch('currency')}</span>
              </div>
              {form.watch('enable_iva') && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA:</span>
                  <span className="font-medium">{(form.watch('iva_rate') * 100).toFixed(0)}%</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">% Honorarios (default):</span>
                <span className="font-medium">{(form.watch('honorarios_pct_default') * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">% Desperdicio (default):</span>
                <span className="font-medium">{(form.watch('desperdicio_pct_default') * 100).toFixed(0)}%</span>
              </div>
              <div className="border-t pt-3 mt-2">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground font-medium">Estructura inicial:</span>
                  <span className="font-semibold">
                    {selectedMayorIds.length} {selectedMayorIds.length === 1 ? 'Mayor' : 'Mayores'} desde TU
                  </span>
                </div>
                {selectedMayorIds.length > 0 && (
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Mayores seleccionados:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedMayorIds.map(mayorId => {
                        const mayor = mayoresTU.find(m => m.id === mayorId);
                        return mayor ? (
                          <span key={mayorId} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            <span className="font-mono">{mayor.codigo}</span>
                            <span>{mayor.nombre}</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        ref={dialogContentRef}
        className="max-w-2xl"
        onKeyDownCapture={handleDialogKeyDownCapture}
        onFocusCapture={handleDialogFocusCapture}
        onKeyDown={handleDialogKeyDown}
        onWheel={handleDialogWheel}
        onInteractOutside={(e) => {
          const target = e.target as Element
          if (target.closest('[data-combobox-root]')) {
            console.log('[Dialog] Preventing close on combobox interaction')
            e.preventDefault()
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target as Element  
          if (target.closest('[data-combobox-root]')) {
            console.log('[Dialog] Preventing close on combobox focus')
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Nuevo presupuesto</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium ${
                  s < step
                    ? 'border-primary bg-primary text-primary-foreground'
                    : s === step
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-12 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <div className="min-h-[300px]">{renderStep()}</div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={step === 1 ? handleClose : handleBack} disabled={loading}>
            {step === 1 ? 'Cancelar' : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Atrás
              </>
            )}
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} disabled={loading}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando...' : 'Crear presupuesto'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
