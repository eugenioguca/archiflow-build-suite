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

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'employee' | 'client';
  [key: string]: any;
}

interface UserDeleteDialogProps {
  user: UserProfile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserDeleted: (userId: string) => void;
}

export function UserDeleteDialog({ 
  user, 
  isOpen, 
  onOpenChange, 
  onUserDeleted 
}: UserDeleteDialogProps) {
  const [confirmationName, setConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  if (!user) return null;

  const userDisplayName = user.full_name || user.email || 'Usuario sin nombre';
  const isConfirmationValid = confirmationName.toLowerCase() === userDisplayName.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe escribir el nombre del usuario correctamente para confirmar la eliminación."
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
      
      // Call the delete-user edge function
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.user_id }
      });

      if (error) throw error;

      toast({
        title: "Usuario eliminado",
        description: `El usuario ${userDisplayName} ha sido eliminado exitosamente.`
      });

      onUserDeleted(user.user_id);
      onOpenChange(false);
      setConfirmationName('');
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Error al eliminar usuario",
        description: error.message || "No se pudo eliminar el usuario. Inténtelo de nuevo."
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
            <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                ¿Está seguro de que desea eliminar el usuario <strong>{userDisplayName}</strong>?
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Esta acción es irreversible y eliminará:
                </p>
                <ul className="text-sm text-destructive/80 space-y-1 ml-4">
                  <li>• El perfil del usuario y toda su información</li>
                  <li>• Su cuenta de autenticación</li>
                  <li>• Todas las asignaciones de sucursales</li>
                  <li>• Los registros relacionados en la base de datos</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Para confirmar, escriba el nombre del usuario: <strong>{userDisplayName}</strong>
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationName}
                  onChange={(e) => setConfirmationName(e.target.value)}
                  placeholder="Escriba el nombre del usuario"
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
                Eliminar Usuario
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}