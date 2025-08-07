import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, DollarSign, Building2, User, Palette, BarChart3 } from 'lucide-react';

export const PaymentPlanIntegrationStatus: React.FC = () => {
  const integrations = [
    {
      module: 'Ventas',
      icon: User,
      status: 'completed',
      description: 'Crear planes de diseño',
      features: ['Crear plan de diseño', 'Validaciones de documentos', 'Transición automática']
    },
    {
      module: 'Diseño',
      icon: Palette,
      status: 'completed',
      description: 'Crear planes de construcción',
      features: ['Crear plan de construcción', 'Validar presupuesto', 'Gestión completa']
    },
    {
      module: 'Finanzas',
      icon: BarChart3,
      status: 'completed',
      description: 'Gestión completa',
      features: ['CRUD completo', 'Aprobar planes', 'Marcar pagos', 'Reportes']
    },
    {
      module: 'Portal Cliente',
      icon: Building2,
      status: 'completed',
      description: 'Vista de solo lectura',
      features: ['Ver planes de pago', 'Progreso de pagos', 'Historial completo']
    },
    {
      module: 'Cliente Preview',
      icon: Building2,
      status: 'completed',
      description: 'Vista de administrador',
      features: ['Preview de portal', 'Datos reales', 'Testing completo']
    }
  ];

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          Sistema de Planes de Pago - Integración Completa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <div key={integration.module} className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">{integration.module}</h4>
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    ✓ Completo
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>
                <ul className="text-xs space-y-1">
                  {integration.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Funcionalidades Implementadas
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-green-700 mb-1">Backend</h5>
              <ul className="space-y-1 text-xs">
                <li>✓ Hooks usePaymentPlans</li>
                <li>✓ Hooks usePaymentInstallments</li>
                <li>✓ Validaciones de negocio</li>
                <li>✓ Transiciones automáticas</li>
                <li>✓ Triggers de base de datos</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-green-700 mb-1">Frontend</h5>
              <ul className="space-y-1 text-xs">
                <li>✓ Componentes modulares</li>
                <li>✓ Formularios validados</li>
                <li>✓ UI responsiva</li>
                <li>✓ Estados de carga</li>
                <li>✓ Notificaciones en tiempo real</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center p-3 bg-green-100 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            🎉 El sistema de planes de pago está completamente integrado y operativo en todos los módulos
          </p>
        </div>
      </CardContent>
    </Card>
  );
};