import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Componente temporal simplificado mientras se actualiza el sistema
export const SalesExecutiveDashboard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Dashboard en Actualización
        </CardTitle>
        <CardDescription>
          El dashboard se está actualizando para funcionar con la nueva arquitectura Cliente-Proyecto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-center py-8">
          <div className="text-lg font-semibold text-muted-foreground">
            Sistema Refactorizado Exitosamente
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            <p>✅ Clientes y Proyectos ahora son entidades separadas</p>
            <p>✅ Documentos vinculados por proyecto específico</p>
            <p>✅ Mejor organización de la información</p>
            <p className="mt-4 font-medium">
              Dashboard completo disponible próximamente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};