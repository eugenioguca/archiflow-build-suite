/**
 * Publish Button Component with WBS validation
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishBudget } from '../../services/snapshotService';
import { Upload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface PublishButtonProps {
  budgetId: string;
  ivaRate?: number;
  retencionesRate?: number;
  disabled?: boolean;
}

export function PublishButton({
  budgetId,
  ivaRate = 0.16,
  retencionesRate = 0,
  disabled,
}: PublishButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const publishMutation = useMutation({
    mutationFn: () =>
      publishBudget(budgetId, {
        ivaRate,
        retencionesRate,
      }),
    onSuccess: (snapshot) => {
      queryClient.invalidateQueries({ queryKey: ['planning-snapshots', budgetId] });
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      setShowConfirmDialog(false);
      setErrorMessage(null);
      toast({
        title: '✓ Presupuesto publicado',
        description: `Versión ${snapshot.version_number} creada exitosamente`,
      });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const handlePublish = () => {
    setErrorMessage(null);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    publishMutation.mutate();
  };

  return (
    <>
      <Button
        onClick={handlePublish}
        disabled={disabled || publishMutation.isPending}
        size="lg"
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {publishMutation.isPending ? 'Publicando...' : 'Publicar Presupuesto'}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Publicación</DialogTitle>
            <DialogDescription>
              Se creará una versión inmutable del presupuesto actual con todos sus datos.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error de validación</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm">
            <p className="font-medium">Se aplicarán los siguientes impuestos:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>IVA: {(ivaRate * 100).toFixed(0)}%</li>
              {retencionesRate > 0 && (
                <li>Retenciones: {(retencionesRate * 100).toFixed(2)}%</li>
              )}
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setErrorMessage(null);
              }}
              disabled={publishMutation.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Publicando...' : 'Confirmar y Publicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
