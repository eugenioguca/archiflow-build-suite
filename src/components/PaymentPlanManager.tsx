import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Componente temporal simplificado mientras se actualiza el sistema
export const PaymentPlanManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Plan de Pagos en Actualización
        </CardTitle>
        <CardDescription>
          Los planes de pago se están actualizando para vincularse a proyectos específicos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-center py-8">
          <div className="text-lg font-semibold text-muted-foreground">
            Sistema Refactorizado
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            <p>Los planes de pago ahora se vincularán a proyectos específicos para mejor control financiero.</p>
            <p className="mt-4 font-medium">
              Funcionalidad actualizada disponible próximamente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};