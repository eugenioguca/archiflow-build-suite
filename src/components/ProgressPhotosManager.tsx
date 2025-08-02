import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";

interface ProgressPhotosManagerProps {
  projectId: string;
}

export function ProgressPhotosManager({ projectId }: ProgressPhotosManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Gestión de Fotos de Avance
        </CardTitle>
        <CardDescription>
          Sistema avanzado de fotografía con geolocalización y markup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Módulo de fotos de avance en desarrollo
        </div>
      </CardContent>
    </Card>
  );
}