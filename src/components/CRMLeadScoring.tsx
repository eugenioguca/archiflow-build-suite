import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// Componente temporal simplificado mientras se actualiza el sistema
export const CRMLeadScoring = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Lead Scoring en Actualización
        </CardTitle>
        <CardDescription>
          El sistema de puntuación de leads se está actualizando para la nueva estructura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-center py-8">
          <div className="text-lg font-semibold text-muted-foreground">
            Migración Completa
          </div>
          <div className="text-sm text-muted-foreground max-w-md mx-auto">
            <p>El lead scoring ahora trabajará con datos de proyectos específicos para mayor precisión.</p>
            <p className="mt-4 font-medium">
              Sistema actualizado disponible próximamente
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};