import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Plus, MapPin, Grid, List, Upload } from "lucide-react";

interface ProgressPhotosManagerProps {
  projectId: string;
}

export function ProgressPhotosManager({ projectId }: ProgressPhotosManagerProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Total Fotos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-muted-foreground">Hoy</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-muted-foreground">Esta Semana</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-muted-foreground">Con GPS</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Gestión de Fotos de Avance
              </CardTitle>
              <CardDescription>
                Sistema avanzado de fotografía con geolocalización y markup
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <div className="flex rounded-lg border">
                <Button variant="default" size="sm" className="rounded-r-none">
                  <Grid className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="rounded-l-none">
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Subir Fotos
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-12">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sistema de Fotos de Avance</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Funcionalidades incluidas en desarrollo:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="p-4 border rounded-lg">
                <Camera className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium">Subida Automática</h4>
                <p className="text-sm text-muted-foreground">Con metadata EXIF y compresión</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <MapPin className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium">Geolocalización</h4>
                <p className="text-sm text-muted-foreground">GPS automático y mapas</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Badge className="h-8 w-8 bg-purple-500 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xs">AI</span>
                </Badge>
                <h4 className="font-medium">Clasificación Automática</h4>
                <p className="text-sm text-muted-foreground">Por fase y tipo de trabajo</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Upload className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <h4 className="font-medium">Markup Digital</h4>
                <p className="text-sm text-muted-foreground">Anotaciones y mediciones</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Grid className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
                <h4 className="font-medium">Comparativa Temporal</h4>
                <p className="text-sm text-muted-foreground">Antes y después automático</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <List className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-medium">Reportes Visuales</h4>
                <p className="text-sm text-muted-foreground">Generación automática PDF</p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Próximamente:</strong> Sistema completo de gestión fotográfica para documentar el progreso de construcción con tecnología avanzada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}