import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface QualityInspectionsProps {
  projectId: string;
}

export function QualityInspections({ projectId }: QualityInspectionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Inspecciones de Calidad
        </CardTitle>
        <CardDescription>
          Sistema de inspecciones y control de calidad
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Módulo de inspecciones de calidad en desarrollo
        </div>
      </CardContent>
    </Card>
  );
}