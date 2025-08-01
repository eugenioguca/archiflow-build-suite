import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFileType, formatFileSize } from "@/lib/fileUtils";

interface ClientDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

interface ClientDocumentUploaderProps {
  clientId: string;
  clientName: string;
  onDocumentUploaded?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'curp', label: 'CURP', description: 'Clave Única de Registro de Población' },
  { value: 'rfc', label: 'RFC', description: 'Registro Federal de Contribuyentes' },
  { value: 'identificacion', label: 'Identificación Oficial', description: 'INE, Pasaporte, etc.' },
  { value: 'constancia_fiscal', label: 'Constancia de Situación Fiscal', description: 'Documento SAT' },
  { value: 'contrato', label: 'Contrato', description: 'Documentos contractuales' },
  { value: 'otro', label: 'Otro', description: 'Otros documentos legales' },
];

export function ClientDocumentUploader({ clientId, clientName, onDocumentUploaded }: ClientDocumentUploaderProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Crear path para el archivo
      const timestamp = Date.now();
      const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      const folder = ['curp', 'rfc', 'constancia_fiscal', 'identificacion'].includes(documentType) 
        ? 'fiscal' 
        : 'legal';
      
      const filePath = `cliente_${sanitizedClientName}_${timestamp}/${folder}/${fileName}`;

      // Subir archivo al bucket privado
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Guardar referencia en la base de datos
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          document_type: documentType,
          document_name: fileName,
          file_path: filePath,
          file_type: getFileType(fileName).type,
          file_size: file.size,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Documento subido",
        description: `${fileName} se ha subido correctamente`,
      });

      fetchDocuments();
      onDocumentUploaded?.();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: ClientDocument) => {
    try {
      // Eliminar archivo del storage
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Eliminar referencia de la base de datos
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado correctamente",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (doc: ClientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;

      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.download = doc.document_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos del Cliente (Fase Lead)
        </CardTitle>
        <CardDescription>
          Documentos sensibles que se heredarán automáticamente al crear el proyecto
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Botones de subida por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DOCUMENT_TYPES.map((docType) => (
            <div key={docType.value} className="relative">
              <input
                type="file"
                id={`upload-${docType.value}`}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file, docType.value);
                  }
                  // Reset input
                  e.target.value = '';
                }}
                disabled={uploading}
              />
              <Button
                variant="outline"
                className="w-full h-auto flex flex-col gap-1 p-3"
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                <span className="text-xs font-medium">{docType.label}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {docType.description}
                </span>
              </Button>
            </div>
          ))}
        </div>

        {uploading && (
          <div className="text-center py-2">
            <span className="text-sm text-muted-foreground">Subiendo documento...</span>
          </div>
        )}

        {/* Lista de documentos */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Documentos Subidos</h4>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.document_name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="capitalize">
                      {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    </span>
                    {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {documents.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay documentos subidos</p>
            <p className="text-sm">Sube documentos usando los botones de arriba</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}