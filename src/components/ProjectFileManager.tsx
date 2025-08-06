import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientDocumentHub } from './ClientDocumentHub';
import { ClientProgressPhotosViewer } from './ClientProgressPhotosViewer';
import { FolderOpen, Camera } from 'lucide-react';

interface ProjectFileManagerProps {
  clientId: string;
  projectId: string;
  projectName: string;
}

export const ProjectFileManager: React.FC<ProjectFileManagerProps> = ({
  clientId,
  projectId,
  projectName,
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Expediente del Proyecto</h2>
        <p className="text-muted-foreground">{projectName}</p>
      </div>

      <Tabs defaultValue="documents" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotografías de Progreso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Documentos del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-hidden">
              <ClientDocumentHub 
                clientId={clientId}
                projectId={projectId}
                compact={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Fotografías de Progreso
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-hidden">
              <ClientProgressPhotosViewer projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};