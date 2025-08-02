import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Componente temporal simplificado mientras se actualiza el sistema
export const SalesPhaseManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Gestor de Fases en Actualización
        </CardTitle>
        <CardDescription>
          El gestor de fases de ventas se está actualizando para funcionar con proyectos específicos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-center py-8">
          <div className="text-lg font-semibold text-muted-foreground">
            Nueva Estructura Implementada
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            <p>Las fases de ventas ahora se manejan por proyecto específico para mejor seguimiento.</p>
            <p className="mt-4 font-medium">
              Funcionalidad completa disponible próximamente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};