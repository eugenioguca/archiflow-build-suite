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

interface Client {
  id: string;
  full_name: string;
  email?: string | null;
  [key: string]: any;
}

interface ClientDeleteDialogProps {
  client: Client | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClientDeleted: (clientId: string) => void;
}

export function ClientDeleteDialog({ 
  client, 
  isOpen, 
  onOpenChange, 
  onClientDeleted 
}: ClientDeleteDialogProps) {
  const [confirmationName, setConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  if (!client) return null;

  const clientDisplayName = client.full_name || client.email || 'Cliente sin nombre';
  const isConfirmationValid = confirmationName.toLowerCase() === clientDisplayName.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe escribir el nombre del cliente correctamente para confirmar la eliminación."
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
      const { error } = await supabase.rpc('delete_client_cascade', {
        client_id_param: client.id
      });

      if (error) throw error;

      toast({
        title: "Cliente eliminado",
        description: `El cliente ${clientDisplayName} y todos sus datos relacionados han sido eliminados exitosamente.`
      });

      onClientDeleted(client.id);
      onOpenChange(false);
      setConfirmationName('');
      
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        variant: "destructive",
        title: "Error al eliminar cliente",
        description: error.message || "No se pudo eliminar el cliente. Inténtelo de nuevo."
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
            <AlertDialogTitle>Eliminar Cliente</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                ¿Está seguro de que desea eliminar el cliente <strong>{clientDisplayName}</strong>?
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Esta acción es irreversible y eliminará:
                </p>
                <ul className="text-sm text-destructive/80 space-y-1 ml-4">
                  <li>• Todos los proyectos del cliente</li>
                  <li>• Todos los documentos asociados</li>
                  <li>• Planes de pago e historial de pagos</li>
                  <li>• Presupuestos y registros de construcción</li>
                  <li>• Conversaciones del chat y notificaciones</li>
                  <li>• Registros financieros (ingresos y gastos)</li>
                  <li>• Cronogramas y fases de diseño/construcción</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Para confirmar, escriba el nombre del cliente: <strong>{clientDisplayName}</strong>
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationName}
                  onChange={(e) => setConfirmationName(e.target.value)}
                  placeholder="Escriba el nombre del cliente"
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
                Eliminar Cliente
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}