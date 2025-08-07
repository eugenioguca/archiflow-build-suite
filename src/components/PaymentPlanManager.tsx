import React, { useState } from 'react';
import { Plus, Eye, Edit, Trash2, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { usePaymentPlans, PaymentPlan } from '@/hooks/usePaymentPlans';
import { useAuth } from '@/hooks/useAuth';
import { PaymentInstallmentsTable } from './PaymentInstallmentsTable';
import { CurrencyInput } from './CurrencyInput';
import { PaymentPlanForm } from './forms/PaymentPlanForm';
import { PaymentPlanValidations } from './PaymentPlanValidations';
import { supabase } from '@/integrations/supabase/client';

interface PaymentPlanManagerProps {
  clientProjectId: string;
  planType?: 'design_payment' | 'construction_payment';
  readOnly?: boolean;
  compact?: boolean;
}

export const PaymentPlanManager: React.FC<PaymentPlanManagerProps> = ({
  clientProjectId,
  planType,
  readOnly = false,
  compact = false
}) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'employee';
  const { 
    paymentPlans, 
    isLoading, 
    createPaymentPlan, 
    updatePaymentPlan, 
    approvePaymentPlan,
    deletePaymentPlan 
  } = usePaymentPlans(clientProjectId, planType);

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    plan_name: '',
    plan_type: planType || 'design_payment',
    total_amount: 0,
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      plan_name: '',
      plan_type: planType || 'design_payment',
      total_amount: 0,
      notes: ''
    });
  };

  const handleCreate = async (data: any & { installments?: any[] }) => {
    // Validate construction payment plan requirements
    if (data.plan_type === 'construction_payment') {
      try {
        const { data: project } = await supabase
          .from('client_projects')
          .select('construction_budget, status')
          .eq('id', clientProjectId)
          .single();

        if (!project || project.construction_budget <= 0) {
          toast({
            title: "Error",
            description: "Debe existir un presupuesto de construcción aprobado antes de crear un plan de pago de construcción.",
            variant: "destructive"
          });
          return;
        }

        if (project.status !== 'design' && project.status !== 'construction') {
          toast({
            title: "Error", 
            description: "Los planes de construcción solo pueden crearse en proyectos de diseño completado.",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        console.error('Error validating construction requirements:', error);
        toast({
          title: "Error",
          description: "Error al validar los requisitos del proyecto.",
          variant: "destructive"
        });
        return;
      }
    }

    createPaymentPlan.mutate({
      client_project_id: clientProjectId,
      plan_type: data.plan_type as 'design_payment' | 'construction_payment',
      plan_name: data.plan_name,
      total_amount: data.total_amount,
      notes: data.notes,
      status: 'pending'
    }, {
      onSuccess: async (newPlan) => {
        setIsCreateDialogOpen(false);
        resetForm();
        
        // Crear installments automáticamente si existen sugerencias
        if (data.installments && data.installments.length > 0) {
          try {
            const installmentsData = data.installments.map((inst: any, index: number) => ({
              payment_plan_id: newPlan.id,
              installment_number: index + 1,
              description: inst.description,
              amount: inst.amount,
              due_date: inst.due_date instanceof Date ? inst.due_date.toISOString().split('T')[0] : inst.due_date,
              status: 'pending'
            }));

            const { error: installmentsError } = await supabase
              .from('payment_installments')
              .insert(installmentsData);

            if (installmentsError) {
              console.error('Error creating installments:', installmentsError);
              toast({
                title: "Advertencia",
                description: "Plan creado pero hubo un error al crear las parcialidades automáticamente. Puedes crearlas manualmente.",
                variant: "destructive"
              });
            } else {
              toast({
                title: "¡Éxito!",
                description: `Plan de pago creado con ${data.installments.length} parcialidades.`
              });
            }
          } catch (error) {
            console.error('Error creating installments:', error);
          }
        }
      }
    });
  };

  const handleEdit = async (data: any) => {
    if (!selectedPlan) return;

    updatePaymentPlan.mutate({
      id: selectedPlan.id,
      data: {
        plan_name: data.plan_name,
        total_amount: data.total_amount,
        notes: data.notes
      }
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setSelectedPlan(null);
        resetForm();
      }
    });
  };

  const handleApprove = async (plan: PaymentPlan) => {
    approvePaymentPlan.mutate(plan.id);
  };

  const handleDelete = async (plan: PaymentPlan) => {
    deletePaymentPlan.mutate(plan.id);
  };

  const openEditDialog = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      plan_type: plan.plan_type,
      total_amount: plan.total_amount,
      notes: plan.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pendiente' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Aprobado' },
      active: { variant: 'default' as const, icon: DollarSign, label: 'Activo' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completado' },
      cancelled: { variant: 'destructive' as const, icon: AlertCircle, label: 'Cancelado' }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPlanTypeBadge = (type: string) => {
    return type === 'design_payment' ? (
      <Badge variant="outline">Diseño</Badge>
    ) : (
      <Badge variant="outline">Construcción</Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {!readOnly && canEdit && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Planes de Pago</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                  <DialogTitle>Crear Plan de Pago</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {/* Validaciones ocultas pero funcionales */}
                  <div className="hidden">
                    <PaymentPlanValidations 
                      projectId={clientProjectId}
                      planType={planType || 'design_payment'}
                    />
                  </div>
                  <PaymentPlanForm
                    onSubmit={handleCreate}
                    onCancel={() => setIsCreateDialogOpen(false)}
                    planType={planType}
                    isSubmitting={createPaymentPlan.isPending}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="grid gap-4">
          {paymentPlans.map((plan) => (
            <Card key={plan.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plan.plan_name}</h4>
                      {getPlanTypeBadge(plan.plan_type)}
                      {getStatusBadge(plan.status)}
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      ${plan.total_amount.toLocaleString('es-MX')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Secuencia: {plan.plan_sequence} • Creado: {new Date(plan.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openViewDialog(plan)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!readOnly && canEdit && plan.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleApprove(plan)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar plan de pago?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará el plan de pago y todas sus parcialidades.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(plan)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {paymentPlans.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No hay planes de pago creados</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <DialogTitle>Editar Plan de Pago</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
              <PaymentPlanForm
                onSubmit={handleEdit}
                onCancel={() => setIsEditDialogOpen(false)}
                initialData={selectedPlan ? {
                  plan_name: selectedPlan.plan_name,
                  plan_type: selectedPlan.plan_type,
                  total_amount: selectedPlan.total_amount,
                  notes: selectedPlan.notes || ''
                } : undefined}
                planType={planType}
                isSubmitting={updatePaymentPlan.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles del Plan de Pago</DialogTitle>
            </DialogHeader>
            {selectedPlan && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre del Plan</Label>
                    <p className="font-medium">{selectedPlan.plan_name}</p>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <div className="mt-1">{getPlanTypeBadge(selectedPlan.plan_type)}</div>
                  </div>
                  <div>
                    <Label>Monto Total</Label>
                    <p className="text-2xl font-bold text-primary">
                      ${selectedPlan.total_amount.toLocaleString('es-MX')}
                    </p>
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <div className="mt-1">{getStatusBadge(selectedPlan.status)}</div>
                  </div>
                </div>
                
                {selectedPlan.notes && (
                  <div>
                    <Label>Notas</Label>
                    <p className="text-sm text-muted-foreground">{selectedPlan.notes}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-4">Parcialidades</h4>
                  <PaymentInstallmentsTable 
                    paymentPlanId={selectedPlan.id}
                    readOnly={readOnly}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
};