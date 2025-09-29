/**
 * Wizard de 3 pasos para crear presupuesto con Searchable Comboboxes
 * Usa los mismos comboboxes que el módulo de transacciones unificadas
 */
import { useState, useEffect } from 'react';
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
import { SearchableCombobox, SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { useToast } from '@/hooks/use-toast';
import { createBudget, createPartida } from '../../services/budgetService';
import { projectsAdapter } from '../../adapters/projects';
import { clientsAdapter } from '../../adapters/clients';
import type { ProjectAdapter } from '../../adapters/projects';
import type { ClientAdapter } from '../../adapters/clients';

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
  
  // Datos para los comboboxes (estilo TU)
  const [clientes, setClientes] = useState<SearchableComboboxItem[]>([]);
  const [proyectos, setProyectos] = useState<SearchableComboboxItem[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingProyectos, setLoadingProyectos] = useState(false);

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

  // Cargar datos cuando se abre el wizard (estilo TU)
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
      const clientesItems: SearchableComboboxItem[] = result.map(c => ({
        value: c.id,
        label: c.full_name,
        searchText: c.full_name.toLowerCase()
      }));
      setClientes(clientesItems);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive'
      });
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadProyectos = async () => {
    setLoadingProyectos(true);
    try {
      const result = await projectsAdapter.getAll();
      const proyectosItems: SearchableComboboxItem[] = result.map(p => ({
        value: p.id,
        label: p.project_name,
        searchText: p.project_name.toLowerCase()
      }));
      setProyectos(proyectosItems);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudieron cargar los proyectos',
        variant: 'destructive'
      });
      setProyectos([]);
    } finally {
      setLoadingProyectos(false);
    }
  };

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

  // Filtrar proyectos por cliente seleccionado (estilo TU)
  const proyectosFiltrados = form.watch('client_id')
    ? proyectos.filter(p => {
        // Buscar proyecto completo para verificar client_id
        const projectData = projectsAdapter.getAll().then(all => 
          all.find(proj => proj.id === p.value)
        );
        return true; // Por ahora mostrar todos, implementar filtro si es necesario
      })
    : proyectos;

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
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente</Label>
                <SearchableCombobox
                  items={clientes}
                  value={form.watch('client_id')}
                  onValueChange={async (value) => {
                    form.setValue('client_id', value);
                    if (value) {
                      const client = await clientsAdapter.getById(value);
                      setSelectedClient(client);
                    } else {
                      setSelectedClient(null);
                    }
                    // Clear project if it doesn't belong to new client
                    const currentProject = form.watch('project_id');
                    if (currentProject && value) {
                      projectsAdapter.getById(currentProject).then(project => {
                        if (project && project.client_id !== value) {
                          form.setValue('project_id', undefined);
                          setSelectedProject(null);
                        }
                      });
                    }
                  }}
                  placeholder="Seleccionar cliente..."
                  searchPlaceholder="Buscar por nombre..."
                  emptyText="Sin resultados"
                  loading={loadingClientes}
                  disabled={loading}
                  searchFields={['label', 'searchText']}
                  className="w-full"
                />
                {form.formState.errors.client_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.client_id.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Opcional. Selecciona un cliente o un proyecto.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Proyecto</Label>
                <SearchableCombobox
                  items={proyectosFiltrados}
                  value={form.watch('project_id')}
                  onValueChange={async (value) => {
                    form.setValue('project_id', value);
                    if (value) {
                      const project = await projectsAdapter.getById(value);
                      setSelectedProject(project);
                      if (project) {
                        form.setValue('client_id', project.client_id);
                        const client = await clientsAdapter.getById(project.client_id);
                        setSelectedClient(client);
                      }
                    } else {
                      setSelectedProject(null);
                    }
                  }}
                  placeholder="Seleccionar proyecto..."
                  searchPlaceholder="Buscar por nombre..."
                  emptyText="Sin resultados"
                  loading={loadingProyectos}
                  disabled={loading}
                  searchFields={['label', 'searchText']}
                  className="w-full"
                />
                {form.formState.errors.project_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.project_id.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Opcional. Si eliges un cliente, filtraremos los proyectos.</p>
              </div>
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
