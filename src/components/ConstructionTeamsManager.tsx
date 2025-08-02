import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, UserPlus, Award, Clock, Star } from "lucide-react";

interface ConstructionTeamsManagerProps {
  projectId: string;
}

export function ConstructionTeamsManager({ projectId }: ConstructionTeamsManagerProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Equipos Totales</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-muted-foreground">Miembros</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">0</div>
            <div className="text-sm text-muted-foreground">Especialidades</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">5.0</div>
            <div className="text-sm text-muted-foreground">Rating Promedio</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Equipos de Trabajo
              </CardTitle>
              <CardDescription>
                Equipos especializados, asignaciones y seguimiento de rendimiento
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Miembro
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Equipo
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sistema de Gestión de Equipos</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Funcionalidades de gestión de equipos de trabajo en desarrollo:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="p-4 border rounded-lg">
                <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium">Equipos Especializados</h4>
                <p className="text-sm text-muted-foreground">Cuadrillas por especialidad y habilidad</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Award className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium">Certificaciones</h4>
                <p className="text-sm text-muted-foreground">Control de capacitación y certificados</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <h4 className="font-medium">Horarios y Turnos</h4>
                <p className="text-sm text-muted-foreground">Programación automática de trabajos</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <h4 className="font-medium">Evaluación de Rendimiento</h4>
                <p className="text-sm text-muted-foreground">Métricas de productividad y calidad</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Badge className="h-8 w-8 bg-cyan-500 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xs">!</span>
                </Badge>
                <h4 className="font-medium">Seguridad Laboral</h4>
                <p className="text-sm text-muted-foreground">Registro de incidentes y capacitación</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Users className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-medium">Asignación Inteligente</h4>
                <p className="text-sm text-muted-foreground">Optimización automática de recursos</p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Próximamente:</strong> Sistema completo de gestión de equipos con seguimiento de rendimiento, programación inteligente y control de seguridad laboral.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}