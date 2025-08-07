import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  File,
  Image,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ClientDocumentUploaderProps {
  projectId: string;
  clientId: string;
  onUploadComplete?: () => void;
}

interface FileUpload {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  category: string;
  description: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'contract', label: 'Contrato' },
  { value: 'plan_pagos', label: 'Plan de Pagos' },
  { value: 'permit', label: 'Permisos' },
  { value: 'legal', label: 'Documentos Legales' },
  { value: 'financial', label: 'Documentos Financieros' },
  { value: 'identification', label: 'Identificación' },
  { value: 'other', label: 'Otros' }
];

export const ClientDocumentUploader: React.FC<ClientDocumentUploaderProps> = ({
  projectId,
  clientId,
  onUploadComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return Image;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const newFiles: FileUpload[] = files.map(file => ({
      file,
      id: generateFileId(),
      progress: 0,
      status: 'pending',
      category: 'other',
      description: ''
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFile = (fileId: string, updates: Partial<FileUpload>) => {
    setSelectedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, ...updates } : f)
    );
  };

  const uploadFile = async (fileUpload: FileUpload): Promise<boolean> => {
    try {
      updateFile(fileUpload.id, { status: 'uploading', progress: 0 });

      // Upload to unified project-documents bucket
      const fileExt = fileUpload.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${clientId}/${projectId}/general/${fileName}`;

      // Simulate progress for UI feedback
      updateFile(fileUpload.id, { progress: 50 });
      
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, fileUpload.file);

      if (uploadError) throw uploadError;

      // Get current user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      // Save document record to unified documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          client_id: clientId,
          project_id: projectId,
          name: fileUpload.file.name,
          category: fileUpload.category,
          department: 'general',
          file_path: filePath,
          file_type: fileUpload.file.type,
          file_size: fileUpload.file.size,
          uploaded_by: profileData.id,
          document_status: 'active',
          access_level: 'internal'
        });

      if (dbError) throw dbError;

      updateFile(fileUpload.id, { status: 'completed', progress: 100 });
      return true;

    } catch (error) {
      console.error('Error uploading file:', error);
      updateFile(fileUpload.id, { status: 'error' });
      return false;
    }
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const fileUpload of selectedFiles) {
      if (fileUpload.status === 'pending') {
        const success = await uploadFile(fileUpload);
        if (success) successCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: "Documentos subidos",
        description: `Se subieron ${successCount} documentos correctamente`
      });
      
      // Clear completed files
      setSelectedFiles(prev => prev.filter(f => f.status !== 'completed'));
      onUploadComplete?.();
    }

    if (successCount < selectedFiles.filter(f => f.status === 'pending').length) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Algunos documentos no se pudieron subir"
      });
    }
  };

  const canUpload = selectedFiles.some(f => f.status === 'pending' && f.category && f.description);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Selecciona documentos para subir</p>
              <p className="text-sm text-muted-foreground">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <Button variant="outline" className="mt-4">
                Seleccionar Archivos
              </Button>
            </div>
          </Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls,.txt"
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Archivos Seleccionados ({selectedFiles.length})</h3>
              <Button
                onClick={handleUploadAll}
                disabled={!canUpload || uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Subir Todos
              </Button>
            </div>

            <div className="space-y-3">
              {selectedFiles.map((fileUpload) => {
                const FileIcon = getFileIcon(fileUpload.file.type);
                
                return (
                  <div key={fileUpload.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <FileIcon className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{fileUpload.file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(fileUpload.file.size)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {fileUpload.status === 'completed' && (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completado
                              </Badge>
                            )}
                            {fileUpload.status === 'error' && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </Badge>
                            )}
                            {fileUpload.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(fileUpload.id)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {fileUpload.status === 'uploading' && (
                          <Progress value={fileUpload.progress} className="h-2" />
                        )}

                        {fileUpload.status === 'pending' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-sm">Categoría</Label>
                              <Select
                                value={fileUpload.category}
                                onValueChange={(value) => updateFile(fileUpload.id, { category: value })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Selecciona categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DOCUMENT_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-sm">Descripción</Label>
                              <Input
                                value={fileUpload.description}
                                onChange={(e) => updateFile(fileUpload.id, { description: e.target.value })}
                                placeholder="Descripción del documento"
                                className="h-9"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};