import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientProjectSelector } from '@/components/ClientProjectSelector';
import { Separator } from '@/components/ui/separator';
import { Eye, FileText, CreditCard, Camera, MessageCircle } from 'lucide-react';

const ClientPortalPreview = () => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Previsualización Client Portal</h1>
        <Badge variant="outline" className="ml-2">Vista Admin</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Cliente y Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientProjectSelector
            selectedClientId={selectedClientId}
            selectedProjectId={selectedProjectId}
            onClientChange={setSelectedClientId}
            onProjectChange={setSelectedProjectId}
          />
        </CardContent>
      </Card>

      {selectedClientId && selectedProjectId && (
        <>
          <Separator />
          
          <div className="grid gap-6">
            {/* Hero Section del Portal */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold">Portal del Cliente</h2>
                  <p className="text-muted-foreground">
                    Vista previa de cómo el cliente ve su portal
                  </p>
                  <div className="flex justify-center gap-4 mt-6">
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Documentos
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <CreditCard className="h-3 w-3" />
                      Pagos
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Camera className="h-3 w-3" />
                      Fotos de Avance
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Chat del Proyecto
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contenido del Portal se cargará aquí */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Proyecto</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Los detalles del proyecto seleccionado aparecerán aquí...
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progreso General</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    El progreso del proyecto aparecerá aquí...
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secciones adicionales del portal */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Gestión de documentos del cliente
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Plan de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Historial y estado de pagos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotos de Avance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Galería de progreso de construcción
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Interface de comunicación con el equipo del proyecto
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientPortalPreview;