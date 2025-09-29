/**
 * Diálogo para solicitar justificación cuando hay desviación de precios
 */
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PriceAlert } from '../../services/priceIntelligenceService';

interface PriceValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: PriceAlert;
  onConfirm: (justification: string | null) => void;
  onCancel: () => void;
}

export function PriceValidationDialog({
  open,
  onOpenChange,
  alert,
  onConfirm,
  onCancel,
}: PriceValidationDialogProps) {
  const [justification, setJustification] = useState('');

  const handleConfirm = () => {
    if (alert.requires_justification && !justification.trim()) {
      return; // No permitir confirmar sin justificación
    }
    onConfirm(alert.requires_justification ? justification : null);
    setJustification('');
  };

  const handleCancel = () => {
    setJustification('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Validación de Precio</DialogTitle>
          <DialogDescription>
            El precio ingresado muestra una desviación significativa del histórico.
          </DialogDescription>
        </DialogHeader>

        <Alert variant={alert.severity === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>

        {alert.requires_justification && (
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justificación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Explique el motivo de la desviación del precio..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Se requiere justificación para desviaciones mayores al 30%
            </p>
          </div>
        )}

        {!alert.requires_justification && (
          <p className="text-sm text-muted-foreground">
            ¿Desea continuar con este precio?
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={alert.requires_justification && !justification.trim()}
          >
            Confirmar Precio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
