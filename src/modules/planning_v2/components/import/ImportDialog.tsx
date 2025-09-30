/**
 * Diálogo de importación con flujo multi-paso
 */
import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useImportExport } from '../../hooks/useImportExport';
import { ColumnMappingStep } from './ColumnMappingStep';
import { PreviewValidationStep } from './PreviewValidationStep';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  partidaId: string; // Partida destino para los conceptos
}

type ImportStep = 'upload' | 'mapping' | 'preview';

export function ImportDialog({
  open,
  onOpenChange,
  budgetId,
  partidaId,
}: ImportDialogProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [referenceTotal, setReferenceTotal] = useState<string>('');

  const {
    importData,
    columnMapping,
    setColumnMapping,
    parseFile,
    isParsingFile,
    applyMapping,
    importRows,
    isImporting,
    getAvailableFields,
  } = useImportExport(budgetId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
  };

  const handleFileUpload = () => {
    if (!selectedFile) return;
    
    parseFile(selectedFile, {
      onSuccess: () => {
        setCurrentStep('mapping');
      },
    });
  };

  const handleMappingComplete = () => {
    applyMapping();
    setCurrentStep('preview');
  };

  const handleImport = () => {
    if (!importData) return;
    
    const validRows = importData.rows.filter(r => r.isValid);
    const parsedReferenceTotal = referenceTotal ? parseFloat(referenceTotal) : undefined;
    
    importRows(
      { 
        partidaId, 
        rows: validRows,
        referenceTotal: parsedReferenceTotal
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetDialog();
        },
      }
    );
  };

  const resetDialog = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetDialog();
  };

  const progress = currentStep === 'upload' ? 0 : currentStep === 'mapping' ? 50 : 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Conceptos desde Excel/CSV</DialogTitle>
          <DialogDescription>
            Importe conceptos de presupuesto desde un archivo externo
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Paso {currentStep === 'upload' ? '1' : currentStep === 'mapping' ? '2' : '3'} de 3
            </span>
            <span>
              {currentStep === 'upload'
                ? 'Cargar archivo'
                : currentStep === 'mapping'
                ? 'Mapear columnas'
                : 'Validar y confirmar'}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {currentStep === 'upload' && (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Seleccione un archivo Excel (.xlsx) o CSV
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild>
                      <span>Seleccionar archivo</span>
                    </Button>
                  </label>
                </div>
                {selectedFile && (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="font-medium">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference-total">
                  Total de referencia (MXN) - Opcional
                </Label>
                <Input
                  id="reference-total"
                  type="number"
                  placeholder="Ej: 7730845.47"
                  value={referenceTotal}
                  onChange={(e) => setReferenceTotal(e.target.value)}
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Si conoce el total esperado del Excel, ingréselo para validar la importación
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Formato requerido:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Primera fila debe contener los encabezados de columna</li>
                  <li>Campos mínimos: Descripción, Unidad, Cantidad Real, Precio Real</li>
                  <li>Números pueden usar punto o coma como decimal</li>
                  <li>Soporta separadores de miles</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 'mapping' && importData && (
            <ColumnMappingStep
              columns={importData.columns}
              columnMapping={columnMapping}
              onMappingChange={setColumnMapping}
              availableFields={getAvailableFields()}
            />
          )}

          {currentStep === 'preview' && importData && (
            <PreviewValidationStep 
              data={importData}
              referenceTotal={referenceTotal ? parseFloat(referenceTotal) : null}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {currentStep !== 'upload' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (currentStep === 'mapping') setCurrentStep('upload');
                  else if (currentStep === 'preview') setCurrentStep('mapping');
                }}
                disabled={isParsingFile || isImporting}
              >
                Atrás
              </Button>
            )}

            {currentStep === 'upload' && (
              <Button
                onClick={handleFileUpload}
                disabled={!selectedFile || isParsingFile}
              >
                {isParsingFile ? 'Cargando...' : 'Continuar'}
              </Button>
            )}

            {currentStep === 'mapping' && (
              <Button onClick={handleMappingComplete}>
                Continuar
              </Button>
            )}

            {currentStep === 'preview' && (
              <Button
                onClick={handleImport}
                disabled={!importData || importData.validRows === 0 || isImporting}
              >
                {isImporting ? 'Importando...' : `Importar ${importData.validRows} conceptos`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
