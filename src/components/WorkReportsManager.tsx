import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface WorkReportsManagerProps {
  projectId: string;
}

export function WorkReportsManager({ projectId }: WorkReportsManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reportes de Trabajo
        </CardTitle>
        <CardDescription>
          Reportes diarios de avance y actividades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Módulo de reportes de trabajo en desarrollo
        </div>
      </CardContent>
    </Card>
  );
}