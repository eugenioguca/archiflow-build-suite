/**
 * Diálogo de exportación con selección de columnas
 */
import { useState } from 'react';
import { FileDown, FileSpreadsheet, TestTube2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useImportExport } from '../../hooks/useImportExport';
import { exportService } from '../../services/exportService';
import type { ExportColumn } from '../../services/exportService';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
  clientName?: string;
  projectName?: string;
  partidas: any[];
  conceptos: any[];
}

export function ExportDialog({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  clientName,
  projectName,
  partidas,
  conceptos,
}: ExportDialogProps) {
  const { getDefaultExportColumns, exportBudget, isExporting } = useImportExport(budgetId);
  
  const [columns, setColumns] = useState<ExportColumn[]>(() => getDefaultExportColumns());
  const [includeSubtotals, setIncludeSubtotals] = useState(true);
  const [includeGrandTotal, setIncludeGrandTotal] = useState(true);
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const [folio, setFolio] = useState(() => {
    // Auto-generar folio: PRE-YYYYMMDD-###
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PRE-${today}-${random}`;
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleToggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    exportBudget(
      {
        partidas,
        conceptos,
        options: {
          format,
          columns,
          includeSubtotals,
          includeGrandTotal,
          hideZeroRows,
          budgetName,
          clientName,
          projectName,
          folio,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await exportService.testRoundTrip(
        partidas,
        conceptos,
        {
          format: 'excel',
          columns,
          includeSubtotals,
          includeGrandTotal,
          hideZeroRows,
          budgetName,
          clientName,
          projectName,
          folio,
        }
      );
      
      setTestResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error running test:', error);
      toast.error('Error al ejecutar test de round-trip');
    } finally {
      setIsTesting(false);
    }
  };

  const visibleCount = columns.filter(col => col.visible).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar Presupuesto</DialogTitle>
          <DialogDescription>
            Seleccione el formato y las columnas a incluir en la exportación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Folio */}
          <div className="space-y-2">
            <Label htmlFor="folio">Folio del documento</Label>
            <Input
              id="folio"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="PRE-20250930-001"
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="subtotals">Incluir subtotales por partida</Label>
              <Switch
                id="subtotals"
                checked={includeSubtotals}
                onCheckedChange={setIncludeSubtotals}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="grandtotal">Incluir total general</Label>
              <Switch
                id="grandtotal"
                checked={includeGrandTotal}
                onCheckedChange={setIncludeGrandTotal}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hidezero">Ocultar conceptos en cero</Label>
              <Switch
                id="hidezero"
                checked={hideZeroRows}
                onCheckedChange={setHideZeroRows}
              />
            </div>
          </div>

          {/* Column selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Columnas a exportar ({visibleCount} seleccionadas)</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setColumns(prev => prev.map(col => ({ ...col, visible: true })))
                  }
                >
                  Todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setColumns(prev => prev.map(col => ({ ...col, visible: false })))
                  }
                >
                  Ninguna
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-3">
                {columns.map((column) => (
                  <div key={column.key} className="flex items-center gap-3">
                    <Checkbox
                      id={column.key}
                      checked={column.visible}
                      onCheckedChange={() => handleToggleColumn(column.key)}
                    />
                    <Label
                      htmlFor={column.key}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {column.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {column.type === 'currency'
                        ? 'Moneda'
                        : column.type === 'percentage'
                        ? 'Porcentaje'
                        : column.type === 'number'
                        ? 'Número'
                        : 'Texto'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Round-trip test */}
          <div className="space-y-3">
            <Label>Test de integridad (Round-trip)</Label>
            <p className="text-sm text-muted-foreground">
              Verifica que el total se mantenga idéntico al exportar e importar
            </p>
            <Button
              variant="outline"
              onClick={handleRunTest}
              disabled={isTesting || visibleCount === 0}
              className="w-full"
            >
              <TestTube2 className="h-4 w-4 mr-2" />
              {isTesting ? 'Ejecutando test...' : 'Ejecutar test de round-trip'}
            </Button>
            
            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">{testResult.message}</p>
                    <p className="text-xs">
                      Total original: ${testResult.originalTotal.toFixed(2)}
                    </p>
                    <p className="text-xs">
                      Total importado: ${testResult.importedTotal.toFixed(2)}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={isExporting || visibleCount === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              
              <Button
                onClick={() => handleExport('excel')}
                disabled={isExporting || visibleCount === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Excel'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
