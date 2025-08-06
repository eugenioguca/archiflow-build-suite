import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  project_name: string;
  client_id: string;
  [key: string]: any;
}

interface ProjectDeleteDialogProps {
  project: Project | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectDeleted: (projectId: string) => void;
}

export function ProjectDeleteDialog({ 
  project, 
  isOpen, 
  onOpenChange, 
  onProjectDeleted 
}: ProjectDeleteDialogProps) {
  const [confirmationName, setConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  if (!project) return null;

  const projectDisplayName = project.project_name || 'Proyecto sin nombre';
  const isConfirmationValid = confirmationName.toLowerCase() === projectDisplayName.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe escribir el nombre del proyecto correctamente para confirmar la eliminación."
      });
      return;
    }

    // Start countdown
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          proceedWithDeletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const proceedWithDeletion = async () => {
    try {
      setIsDeleting(true);
      
      // Eliminación en cascada completa y correcta
      const { error } = await supabase.rpc('delete_project_cascade', {
        project_id_param: project.id
      });

      if (error) throw error;

      toast({
        title: "Proyecto eliminado",
        description: `El proyecto ${projectDisplayName} y todos sus datos relacionados han sido eliminados exitosamente.`
      });

      onProjectDeleted(project.id);
      onOpenChange(false);
      setConfirmationName('');
      
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({
        variant: "destructive",
        title: "Error al eliminar proyecto",
        description: error.message || "No se pudo eliminar el proyecto. Inténtelo de nuevo."
      });
    } finally {
      setIsDeleting(false);
      setCountdown(0);
    }
  };

  const handleCancel = () => {
    setConfirmationName('');
    setCountdown(0);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Eliminar Proyecto</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                ¿Está seguro de que desea eliminar el proyecto <strong>{projectDisplayName}</strong>?
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Esta acción es irreversible y eliminará:
                </p>
                <ul className="text-sm text-destructive/80 space-y-1 ml-4">
                  <li>• Todos los documentos del proyecto</li>
                  <li>• Planes de pago e historial de pagos</li>
                  <li>• Presupuestos y registros de construcción</li>
                  <li>• Conversaciones del chat y notificaciones</li>
                  <li>• Registros financieros (ingresos y gastos)</li>
                  <li>• Cronogramas y fases de diseño/construcción</li>
                  <li>• Equipos y materiales asignados</li>
                  <li>• Fotografías de progreso</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  El cliente no se verá afectado y otros proyectos permanecerán intactos.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Para confirmar, escriba el nombre del proyecto: <strong>{projectDisplayName}</strong>
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationName}
                  onChange={(e) => setConfirmationName(e.target.value)}
                  placeholder="Escriba el nombre del proyecto"
                  disabled={isDeleting || countdown > 0}
                />
              </div>

              {countdown > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium text-center">
                    Eliminando en {countdown} segundos...
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting || countdown > 0}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : countdown > 0 ? (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminando en {countdown}s
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Proyecto
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}