import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Clock, DollarSign, FileText, User } from 'lucide-react';

interface PaymentPlanValidationsProps {
  projectId: string;
  planType: 'design_payment' | 'construction_payment';
}

export const PaymentPlanValidations: React.FC<PaymentPlanValidationsProps> = ({
  projectId,
  planType
}) => {
  const getValidationChecks = () => {
    if (planType === 'design_payment') {
      return [
        {
          id: 'fiscal_documents',
          label: 'Documentos del Cliente',
          description: 'Constancia fiscal y contrato firmado',
          status: 'completed', // This should be checked against actual data
          icon: FileText
        },
        {
          id: 'sales_stage',
          label: 'Etapa de Ventas',
          description: 'Cliente cerrado en pipeline',
          status: 'completed',
          icon: User
        }
      ];
    } else {
      return [
        {
          id: 'design_completed',
          label: 'Diseño Completado',
          description: 'Todas las fases de diseño terminadas',
          status: 'pending', // This should be checked against actual data
          icon: CheckCircle
        },
        {
          id: 'budget_approved',
          label: 'Presupuesto Aprobado',
          description: 'Presupuesto de construcción aprobado',
          status: 'completed',
          icon: DollarSign
        },
        {
          id: 'design_payment',
          label: 'Pago de Diseño',
          description: 'Plan de diseño completado',
          status: 'completed',
          icon: Clock
        }
      ];
    }
  };

  const checks = getValidationChecks();
  const allCompleted = checks.every(check => check.status === 'completed');

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {allCompleted ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          Validaciones para Plan de {planType === 'design_payment' ? 'Diseño' : 'Construcción'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!allCompleted && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Algunos requisitos no están completos. Verifica antes de crear el plan.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          {checks.map((check) => {
            const Icon = check.icon;
            return (
              <div key={check.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                <Badge 
                  variant={check.status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {check.status === 'completed' ? 'Completo' : 'Pendiente'}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};