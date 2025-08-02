import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Componente temporal simplificado mientras se actualiza el sistema
export const SalesDocumentValidator = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Validador de Documentos en Actualización
        </CardTitle>
        <CardDescription>
          El validador de documentos se está actualizando para la nueva estructura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-center py-8">
          <div className="text-lg font-semibold text-muted-foreground">
            Migración Completa
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            <p>La validación de documentos ahora funcionará con la nueva arquitectura Cliente-Proyecto.</p>
            <p className="mt-4 font-medium">
              Funcionalidad actualizada disponible próximamente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};