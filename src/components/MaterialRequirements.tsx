import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface MaterialRequirementsProps {
  projectId: string;
}

export function MaterialRequirements({ projectId }: MaterialRequirementsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Requerimientos de Materiales
        </CardTitle>
        <CardDescription>
          Control de materiales y proveedores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Módulo de materiales en desarrollo
        </div>
      </CardContent>
    </Card>
  );
}