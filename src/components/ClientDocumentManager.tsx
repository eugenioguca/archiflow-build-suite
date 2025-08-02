import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Componente temporal simplificado mientras se actualiza el sistema
export const ClientDocumentManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Documentos en Actualización
        </CardTitle>
        <CardDescription>
          El sistema de documentos se está actualizando para funcionar con proyectos específicos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-center py-8">
          <div className="text-lg font-semibold text-muted-foreground">
            Nueva Arquitectura Implementada
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            <p>Los documentos ahora se organizan por proyecto específico para mejor trazabilidad.</p>
            <p className="mt-4 font-medium">
              Funcionalidad completa disponible próximamente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};