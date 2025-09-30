/**
 * Diálogo para cargar plantilla desde Excel CAMM
 */
import { useState } from 'react';
import { Upload, FileSpreadsheet, Check } from 'lucide-react';
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
import { toast } from 'sonner';
import { templateService, type TemplateData } from '../../services/templateService';
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
  const [templateName, setTemplateName] = useState('Plantilla CAMM - Julio 2022');
  const [description, setDescription] = useState('Plantilla base de presupuesto CAMM con todas las partidas y conceptos estándar');
  const [isMain, setIsMain] = useState(true);
  const [parsedData, setParsedData] = useState<TemplateData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData(null);
      setProgress(0);
    }
  };

  const handleParseFile = async () => {
    if (!file) return;
    
    setIsParsing(true);
    setProgress(0);
    
    try {
      setProgress(30);
      const data = await templateService.parseCAMMExcel(file);
      setProgress(70);
      
      setParsedData(data);
      setProgress(100);
      
      toast.success(`Archivo parseado: ${data.partidas.length} partidas, ${data.conceptos.length} conceptos`);
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast.error(`Error al parsear archivo: ${error.message}`);
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

          {/* Parsed Data Preview */}
          {parsedData && (
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
              </div>
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
                  placeholder="Ej: Plantilla CAMM - Julio 2022"
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
