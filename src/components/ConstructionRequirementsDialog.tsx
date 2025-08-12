import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  DollarSign, 
  FileCheck,
  ArrowRight
} from "lucide-react";

interface ConstructionRequirementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onConfirm: () => void;
}

interface RequirementStatus {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'pending' | 'not_applicable';
  icon: React.ReactNode;
}

export function ConstructionRequirementsDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  onConfirm 
}: ConstructionRequirementsDialogProps) {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<RequirementStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  useEffect(() => {
    if (open) {
      checkRequirements();
    }
  }, [open, projectId]);

  const checkRequirements = async () => {
    setLoading(true);
    try {
      // Check if budget exists (we'll consider having a budget as accepted for now)
      const { data: projectData, error: projectError } = await supabase
        .from('client_projects')
        .select('construction_budget')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Check if first payment installment exists and is paid
      // First get the payment plan for construction
      const { data: paymentPlan, error: planError } = await supabase
        .from('payment_plans')
        .select('id')
        .eq('client_project_id', projectId)
        .eq('plan_type', 'construction_payment')
        .single();

      let firstPaymentPaid = false;
      
      if (!planError && paymentPlan) {
        const { data: paymentData } = await supabase
          .from('payment_installments')
          .select('status')
          .eq('payment_plan_id', paymentPlan.id)
          .eq('installment_number', 1)
          .single();
        
        firstPaymentPaid = paymentData?.status === 'paid';
      }

      const budgetAccepted = (projectData?.construction_budget || 0) > 0;

      const requirementsList: RequirementStatus[] = [
        {
          id: 'budget_accepted',
          name: 'Presupuesto de Obra Aceptado',
          description: 'El cliente debe haber aceptado el presupuesto de construcción',
          status: budgetAccepted ? 'completed' : 'pending',
          icon: <FileCheck className="h-4 w-4" />
        },
        {
          id: 'first_payment',
          name: 'Primera Parcialidad Pagada',
          description: 'La primera parcialidad del plan de pagos de construcción debe estar pagada',
          status: firstPaymentPaid ? 'completed' : 'pending',
          icon: <DollarSign className="h-4 w-4" />
        }
      ];

      setRequirements(requirementsList);
      
      // Check if all requirements are met
      const allCompleted = requirementsList.every(req => req.status === 'completed');
      setCanProceed(allCompleted);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron verificar los requerimientos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (canProceed) {
      onConfirm();
      onOpenChange(false);
    } else {
      toast({
        title: "Requerimientos Pendientes",
        description: "Todos los requerimientos deben estar completados antes de proceder",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700 border-green-300';
      case 'pending':
        return 'bg-red-500/20 text-red-700 border-red-300';
      default:
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Requerimientos para Pasar a Construcción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Para que un proyecto pueda pasar al módulo de construcción, debe cumplir con los siguientes requerimientos:
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {requirements.map((requirement) => (
                <Card key={requirement.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {requirement.icon}
                        <div className="flex-1">
                          <div className="font-medium">{requirement.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {requirement.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(requirement.status)}
                        <Badge className={getStatusColor(requirement.status)}>
                          {requirement.status === 'completed' ? 'Completado' : 
                           requirement.status === 'pending' ? 'Pendiente' : 'No Aplicable'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && (
            <div className={`p-4 rounded-lg border ${
              canProceed 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                {canProceed ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <div className={`font-medium ${
                  canProceed ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {canProceed 
                    ? 'Todos los requerimientos están completados'
                    : 'Algunos requerimientos están pendientes'
                  }
                </div>
              </div>
              <div className={`text-sm mt-1 ${
                canProceed ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {canProceed 
                  ? 'El proyecto puede proceder al módulo de construcción'
                  : 'Complete los requerimientos pendientes antes de proceder'
                }
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProceed}
              disabled={!canProceed || loading}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              {canProceed ? 'Proceder a Construcción' : 'Requerimientos Pendientes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}