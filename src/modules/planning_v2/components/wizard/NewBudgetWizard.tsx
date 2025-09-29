/**
 * Wizard de 3 pasos para crear presupuesto con Remote Comboboxes
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '@/hooks/use-toast';
import { createBudget, createPartida } from '../../services/budgetService';
import { projectsAdapter } from '../../adapters/projects';
import { clientsAdapter } from '../../adapters/clients';
import type { ProjectAdapter } from '../../adapters/projects';
import type { ClientAdapter } from '../../adapters/clients';
import { RemoteCombobox } from './RemoteCombobox';

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

interface TemplatePartida {
  name: string;
  order_index: number;
  enabled: boolean;
}

const DEFAULT_PARTIDAS: TemplatePartida[] = [
  { name: 'Preliminares', order_index: 0, enabled: true },
  { name: 'Cimentación', order_index: 1, enabled: true },
  { name: 'Estructura', order_index: 2, enabled: true },
  { name: 'Albañilería', order_index: 3, enabled: true },
  { name: 'Instalaciones hidráulicas', order_index: 4, enabled: true },
  { name: 'Instalaciones eléctricas', order_index: 5, enabled: true },
  { name: 'Acabados', order_index: 6, enabled: true },
  { name: 'Carpintería', order_index: 7, enabled: true },
];

interface NewBudgetWizardProps {
  open: boolean;
  onClose: () => void;
}

export function NewBudgetWizard({ open, onClose }: NewBudgetWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [partidas, setPartidas] = useState<TemplatePartida[]>(DEFAULT_PARTIDAS);
  const [selectedClient, setSelectedClient] = useState<ClientAdapter | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectAdapter | null>(null);
  
  // Race-safety refs para handlers async
  const clientReqIdRef = useRef(0);
  const projectReqIdRef = useRef(0);

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
    setPartidas(DEFAULT_PARTIDAS);
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

  const togglePartida = (index: number) => {
    setPartidas(prev => prev.map((p, i) => i === index ? { ...p, enabled: !p.enabled } : p));
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
          enable_iva: values.enable_iva,
          iva_rate: values.iva_rate,
          honorarios_pct_default: values.honorarios_pct_default,
          desperdicio_pct_default: values.desperdicio_pct_default,
          notes: values.notes || null,
        },
      });

      const enabledPartidas = partidas.filter(p => p.enabled);
      await Promise.all(enabledPartidas.map(p => createPartida({
        budget_id: budget.id,
        name: p.name,
        order_index: p.order_index,
        active: true,
        notes: null,
      })));

      toast({ title: 'Presupuesto creado', description: `${budget.name} se creó correctamente` });
      handleClose();
      navigate(`/planning-v2/budgets/${budget.id}`);
    } catch (error: any) {
      toast({ title: 'Error al crear presupuesto', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async (query: string, page: number, limit: number) => {
    const result = await clientsAdapter.search({ q: query, page, limit });
    return { 
      items: result.items.map(c => ({ id: c.id, label: c.full_name })), 
      nextPage: result.nextPage 
    };
  };

  const fetchProjects = async (query: string, page: number, limit: number) => {
    const clientId = form.getValues('client_id'); // Usar getValues en lugar de watch
    const result = await projectsAdapter.search({ 
      q: query, 
      page, 
      limit, 
      clientId: clientId || undefined 
    });
    return { 
      items: result.items.map(p => ({ id: p.id, label: p.project_name })), 
      nextPage: result.nextPage 
    };
  };

  // Handler race-safe para cambio de cliente
  const handleClientChange = async (clientId: string | undefined) => {
    const reqId = ++clientReqIdRef.current;
    
    if (!clientId) {
      setSelectedClient(null);
      form.setValue('project_id', undefined);
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

  // Handler race-safe para cambio de proyecto
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
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
              <RemoteCombobox
                label="Cliente"
                value={form.watch('client_id')}
                onChange={(value) => {
                  form.setValue('client_id', value);
                  handleClientChange(value);
                }}
                fetchItems={fetchClients}
                placeholder="Buscar clientes..."
                searchPlaceholder="Buscar por nombre o código..."
                emptyText="Sin resultados"
                errorText="Error al cargar"
                helperText="Opcional. Selecciona un cliente o un proyecto."
                minChars={2}
              />

              <RemoteCombobox
                label="Proyecto"
                value={form.watch('project_id')}
                onChange={(value) => {
                  form.setValue('project_id', value);
                  handleProjectChange(value);
                }}
                fetchItems={fetchProjects}
                placeholder="Buscar proyectos..."
                searchPlaceholder="Buscar por nombre o código..."
                emptyText="Sin resultados"
                errorText="Error al cargar"
                helperText={
                  form.watch('client_id') 
                    ? 'Filtrado por cliente seleccionado.' 
                    : 'Opcional. Si eliges un cliente, filtraremos los proyectos.'
                }
                minChars={2}
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
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona las partidas iniciales para tu presupuesto. Puedes agregar o quitar partidas más tarde.
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {partidas.map((partida, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                  <span className="font-medium">{partida.name}</span>
                  <Switch checked={partida.enabled} onCheckedChange={() => togglePartida(index)} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {partidas.filter(p => p.enabled).length} de {partidas.length} partidas seleccionadas
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
                <span className="text-muted-foreground">% Honorarios:</span>
                <span className="font-medium">{(form.watch('honorarios_pct_default') * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">% Desperdicio:</span>
                <span className="font-medium">{(form.watch('desperdicio_pct_default') * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Partidas iniciales:</span>
                <span className="font-medium">{partidas.filter(p => p.enabled).length}</span>
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
      <DialogContent className="max-w-2xl">
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
