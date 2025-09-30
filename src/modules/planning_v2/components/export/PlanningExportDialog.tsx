/**
 * Export Dialog for Planning v2
 * Supports PDF and Excel with hierarchy grouping and branding
 */
import { useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { exportPlanningBudget } from '../../services/planningExportService';

interface PlanningExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
  clientName?: string;
  projectName?: string;
}

export function PlanningExportDialog({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  clientName,
  projectName,
}: PlanningExportDialogProps) {
  const [folio, setFolio] = useState('');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setIsExporting(true);

      await exportPlanningBudget({
        budgetId,
        format,
        options: {
          budgetName,
          clientName,
          projectName,
          folio: folio || undefined,
          includeNotes,
          hideZeroRows,
          includeAttachments: format === 'pdf' ? includeAttachments : false,
        },
      });

      toast.success(`Presupuesto exportado a ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error exporting budget:', error);
      toast.error(`Error al exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar Presupuesto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Folio Input */}
          <div className="space-y-2">
            <Label htmlFor="folio">Folio (opcional)</Label>
            <Input
              id="folio"
              placeholder="Ej: PRE-2024-001"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Incluir notas</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar notas de partidas en el documento
                </p>
              </div>
              <Switch checked={includeNotes} onCheckedChange={setIncludeNotes} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ocultar filas en cero</Label>
                <p className="text-sm text-muted-foreground">
                  No mostrar conceptos con cantidad o total en 0
                </p>
              </div>
              <Switch checked={hideZeroRows} onCheckedChange={setHideZeroRows} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Incluir adjuntos (solo PDF)</Label>
                <p className="text-sm text-muted-foreground">
                  Listar nombres y fechas de archivos adjuntos
                </p>
              </div>
              <Switch
                checked={includeAttachments}
                onCheckedChange={setIncludeAttachments}
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Exportar PDF
            </Button>

            <Button
              onClick={() => handleExport('excel')}
              disabled={isExporting}
              variant="outline"
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Exportar Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
