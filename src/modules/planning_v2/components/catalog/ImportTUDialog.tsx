/**
 * Dialog for importing TU structure
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TUTreeSelector, type TUSelection } from './TUTreeSelector';
import { importTUStructure } from '../../services/tuImportService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ImportTUDialogProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  departamento?: string;
}

export function ImportTUDialog({ 
  open, 
  onClose, 
  budgetId,
  departamento = 'CONSTRUCCIÓN'
}: ImportTUDialogProps) {
  const [selection, setSelection] = useState<TUSelection[]>([]);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleClose = () => {
    setSelection([]);
    onClose();
  };

  const handleImport = async () => {
    if (selection.length === 0) {
      toast.error('Selecciona al menos una estructura para importar');
      return;
    }

    setImporting(true);
    try {
      const result = await importTUStructure({
        budgetId,
        selections: selection,
        departamento,
      });

      toast.success(
        `Estructura importada: ${result.partidasCreated} partidas, ${result.conceptosCreated} conceptos (vacíos)`
      );

      // Invalidate queries to refresh the catalog
      queryClient.invalidateQueries({ queryKey: ['planning-budget', budgetId] });
      
      handleClose();
    } catch (error: any) {
      console.error('Error importing TU structure:', error);
      toast.error(`Error al importar: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Agregar desde Transacciones Unificadas</DialogTitle>
          <DialogDescription>
            Selecciona Mayores, Partidas y Subpartidas del catálogo TU para prellenar la estructura.
            Los conceptos se crearán con cantidades en cero.
          </DialogDescription>
        </DialogHeader>

        <TUTreeSelector
          departamento={departamento}
          onSelectionChange={setSelection}
          initialSelection={selection}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={importing || selection.length === 0}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar (${selection.length} ${selection.length === 1 ? 'Mayor' : 'Mayores'})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
