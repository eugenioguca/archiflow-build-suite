import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Search, Filter, Truck, AlertTriangle, CheckCircle } from "lucide-react";

interface MaterialRequirementsProps {
  projectId: string;
}

export function MaterialRequirements({ projectId }: MaterialRequirementsProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Total Materiales</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-muted-foreground">Requeridos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">0</div>
            <div className="text-sm text-muted-foreground">Ordenados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-muted-foreground">Entregados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">0</div>
            <div className="text-sm text-muted-foreground">Faltantes</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Requerimientos de Materiales
              </CardTitle>
              <CardDescription>
                Control de materiales, inventario y proveedores
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Material
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sistema de Control de Materiales</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Funcionalidades de gestión de materiales en desarrollo:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="p-4 border rounded-lg">
                <Package className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium">Inventario Inteligente</h4>
                <p className="text-sm text-muted-foreground">Control automático de stock y reorders</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Truck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium">Proveedores</h4>
                <p className="text-sm text-muted-foreground">Gestión de cotizaciones y entregas</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <h4 className="font-medium">Alertas de Stock</h4>
                <p className="text-sm text-muted-foreground">Notificaciones automáticas de faltantes</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <h4 className="font-medium">Control de Calidad</h4>
                <p className="text-sm text-muted-foreground">Certificaciones y especificaciones</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Badge className="h-8 w-8 bg-cyan-500 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xs">$</span>
                </Badge>
                <h4 className="font-medium">Control de Costos</h4>
                <p className="text-sm text-muted-foreground">Análisis de precios y variaciones</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <Package className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                <h4 className="font-medium">Mermas y Desperdicios</h4>
                <p className="text-sm text-muted-foreground">Control de pérdidas y optimización</p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Próximamente:</strong> Sistema completo de gestión de materiales con integración a proveedores y control de inventario en tiempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}