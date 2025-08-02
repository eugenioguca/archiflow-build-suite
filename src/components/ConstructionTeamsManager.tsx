import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface ConstructionTeamsManagerProps {
  projectId: string;
}

export function ConstructionTeamsManager({ projectId }: ConstructionTeamsManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestión de Equipos de Trabajo
        </CardTitle>
        <CardDescription>
          Equipos especializados y asignaciones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Módulo de equipos de trabajo en desarrollo
        </div>
      </CardContent>
    </Card>
  );
}