import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, Target } from 'lucide-react';

export function ImplementationSummary() {
  const tasks = [
    {
      id: 1,
      title: "Corrección del Plan de Pago de Jorge Garza",
      description: "Plan activado y visible en el módulo de finanzas",
      status: "completed",
      details: "El plan 'Plan de Pagos - Jorge Garza' ahora está activo con 2 cuotas"
    },
    {
      id: 2, 
      title: "Eliminación de Mock Data",
      description: "Datos ficticios removidos de componentes críticos",
      status: "completed",
      details: "InvoicePreview y ConstructionAnalytics actualizados con datos realistas"
    },
    {
      id: 3,
      title: "Integración Cliente-Proyecto",
      description: "Filtros globales implementados en el módulo financiero",
      status: "completed", 
      details: "GlobalFilters componente creado y integrado en FinancesNew"
    },
    {
      id: 4,
      title: "Actualización de PaymentPlansFinance",
      description: "Componente actualizado para mostrar planes activos y en borrador",
      status: "completed",
      details: "Consulta modificada para incluir status 'active' y 'draft'"
    },
    {
      id: 5,
      title: "Optimización de Base de Datos",
      description: "Índices agregados para mejorar rendimiento",
      status: "completed",
      details: "Índices creados en payment_plans, payment_installments y más"
    },
    {
      id: 6,
      title: "Hooks de Filtros Cliente-Proyecto",
      description: "Hook personalizado para manejo consistente de filtros",
      status: "completed",
      details: "useClientProjectFilters hook creado para state management"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      completed: { label: 'Completado', variant: 'default' as const },
      'in-progress': { label: 'En Progreso', variant: 'secondary' as const },
      pending: { label: 'Pendiente', variant: 'outline' as const }
    };
    
    const { label, variant } = config[status as keyof typeof config] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progressPercentage = (completedTasks / tasks.length) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Resumen de Implementación - Módulo de Finanzas
        </CardTitle>
        <CardDescription>
          Estado actual de las mejoras implementadas
        </CardDescription>
        <div className="flex items-center gap-4 mt-4">
          <div className="text-2xl font-bold text-green-600">
            {completedTasks}/{tasks.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {progressPercentage.toFixed(0)}% completado
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(task.status)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{task.title}</h4>
                  {getStatusBadge(task.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {task.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">✅ Plan Integral Completado</h4>
          <p className="text-sm text-green-700">
            El módulo de finanzas ha sido actualizado exitosamente. Jorge Garza's payment plan ahora es visible, 
            los datos mock han sido eliminados, y la arquitectura cliente-proyecto está completamente integrada 
            con filtros globales funcionales.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}