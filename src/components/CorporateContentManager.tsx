import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromotionEditor } from '@/components/dashboard/AdminPanels/PromotionEditor';
import { ManualUploader } from '@/components/dashboard/AdminPanels/ManualUploader';
import { ImageManager } from '@/components/dashboard/AdminPanels/ImageManager';
import { OperationManuals } from '@/components/dashboard/OperationManuals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, FileText, Image, Upload, Plus } from 'lucide-react';

export const CorporateContentManager = () => {
  const [isPromotionEditorOpen, setIsPromotionEditorOpen] = useState(false);
  const [isManualUploaderOpen, setIsManualUploaderOpen] = useState(false);
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleContentUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Gestión de Contenido Corporativo</h2>
      </div>

      <Tabs defaultValue="promotions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Promociones
          </TabsTrigger>
          <TabsTrigger value="manuals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Manuales
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Imagen del Mes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Gestión de Promociones Corporativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Administra las promociones que se muestran en el dashboard corporativo. Puedes crear, editar y eliminar promociones activas.
                </p>
                <Button onClick={() => setIsPromotionEditorOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Gestionar Promociones
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manuals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gestión de Manuales de Operación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Sube y gestiona los manuales de operación disponibles para los empleados.
                </p>
                <Button onClick={() => setIsManualUploaderOpen(true)} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Subir Manual
                </Button>
              </div>
            </CardContent>
          </Card>

          <div key={refreshKey}>
            <OperationManuals />
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Gestión de Imagen del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Actualiza la imagen destacada que se muestra en el dashboard corporativo para el mes actual.
                </p>
                <Button onClick={() => setIsImageManagerOpen(true)} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Cambiar Imagen del Mes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <PromotionEditor
        open={isPromotionEditorOpen}
        onOpenChange={setIsPromotionEditorOpen}
        onPromotionUpdated={handleContentUpdated}
      />

      <ManualUploader
        open={isManualUploaderOpen}
        onOpenChange={setIsManualUploaderOpen}
        onManualUploaded={handleContentUpdated}
      />

      <ImageManager
        open={isImageManagerOpen}
        onOpenChange={setIsImageManagerOpen}
        onImageUpdated={handleContentUpdated}
      />
    </div>
  );
};