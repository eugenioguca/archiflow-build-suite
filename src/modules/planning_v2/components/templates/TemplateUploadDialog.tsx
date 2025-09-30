/**
 * Diálogo para cargar plantilla desde Excel
 */
import { useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import * as templateService from '../../services/templateService';
import { mapTemplateToTU } from '../../services/tuMappingService';
import type { TemplateData } from '../../services/templateService';
import { useQueryClient } from '@tanstack/react-query';

interface TemplateUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateUploadDialog({
  open,
  onOpenChange
}: TemplateUploadDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [parsedData, setParsedData] = useState<TemplateData | null>(null);
  const [mappingResults, setMappingResults] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData(null);
      setMappingResults(null);
      setProgress(0);
      // Auto-set template name from filename
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTemplateName(fileName);
    }
  };

  const handleParseFile = async () => {
    if (!file) return;
    
    setIsParsing(true);
    setProgress(0);
    
    try {
      setProgress(20);
      const data = await templateService.parseCAMMExcel(file);
      setProgress(50);
      
      setParsedData(data);
      
      // Map to TU
      setProgress(70);
      const mapping = await mapTemplateToTU(data.partidas, data.conceptos);
      setMappingResults(mapping);
      setProgress(100);
      
      const { stats, unmappedPartidas, unmappedConceptos } = mapping;
      
      if (unmappedPartidas.length > 0 || unmappedConceptos.length > 0) {
        toast.warning(
          `Archivo parseado con advertencias: ${stats.mappedPartidas}/${stats.totalPartidas} partidas mapeadas, ${stats.mappedConceptos}/${stats.totalConceptos} conceptos mapeados`
        );
      } else {
        toast.success(
          `Archivo parseado exitosamente: ${data.partidas.length} partidas, ${data.conceptos.length} conceptos (todo mapeado a TU)`
        );
      }
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error(error.message || 'Error al parsear archivo');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!parsedData) return;
    
    setIsSaving(true);
    
    try {
      const templateId = await templateService.saveTemplate(
        templateName,
        parsedData,
        {
          description,
          isMain,
          sourceFile: file?.name
        }
      );
      
      toast.success('Plantilla guardada exitosamente');
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      
      // Cerrar diálogo
      onOpenChange(false);
      
      // Reset form
      setFile(null);
      setParsedData(null);
      setProgress(0);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(`Error al guardar plantilla: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cargar Plantilla desde Excel</DialogTitle>
          <DialogDescription>
            Seleccione un archivo Excel con formato CAMM para crear una plantilla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="template-file">Archivo Excel (.xlsx)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="template-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isParsing || isSaving}
              />
              <Button
                variant="outline"
                onClick={handleParseFile}
                disabled={!file || isParsing || isSaving || !!parsedData}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isParsing ? 'Parseando...' : 'Parsear'}
              </Button>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>

          {/* Progress */}
          {isParsing && (
            <div className="space-y-2">
              <Label>Progreso</Label>
              <Progress value={progress} />
            </div>
          )}

          {/* Parsed Data Preview with Mapping Stats */}
          {parsedData && mappingResults && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  Archivo parseado exitosamente
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Partidas:</span>
                    <span className="ml-2 font-medium">{parsedData.partidas.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conceptos:</span>
                    <span className="ml-2 font-medium">{parsedData.conceptos.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Partidas mapeadas:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {mappingResults.stats.mappedPartidas}/{mappingResults.stats.totalPartidas}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conceptos mapeados:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {mappingResults.stats.mappedConceptos}/{mappingResults.stats.totalConceptos}
                    </span>
                  </div>
                </div>
              </div>
              
              {(mappingResults.unmappedPartidas.length > 0 || mappingResults.unmappedConceptos.length > 0) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {mappingResults.unmappedPartidas.length} partidas y {mappingResults.unmappedConceptos.length} conceptos
                    no pudieron mapearse al catálogo TU. Se guardarán sin vinculación.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Template Info */}
          {parsedData && (
            <>
              <div className="space-y-2">
                <Label htmlFor="template-name">Nombre de la Plantilla</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ej: Construcción - Plantilla Base 2024"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Descripción</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción de la plantilla..."
                  rows={3}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-main">Marcar como Plantilla Principal</Label>
                <Switch
                  id="is-main"
                  checked={isMain}
                  onCheckedChange={setIsMain}
                  disabled={isSaving}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isParsing || isSaving}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSaveTemplate}
              disabled={!parsedData || isSaving || !templateName.trim()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
