import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Download, Eye, Trash2, Plus, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ClientDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

interface DocumentRequirement {
  type: string;
  label: string;
  required: boolean;
  description: string;
}

interface ClientDocumentManagerProps {
  clientId: string;
  clientName: string;
  curp?: string;
  onCurpUpdate: (curp: string) => void;
}

const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    type: 'curp',
    label: 'CURP',
    required: true,
    description: 'Clave Única de Registro de Población'
  },
  {
    type: 'situacion_fiscal',
    label: 'Constancia de Situación Fiscal',
    required: true,
    description: 'Documento del SAT con la situación fiscal actual'
  },
  {
    type: 'contrato_servicios',
    label: 'Contrato de Servicios',
    required: true,
    description: 'Contrato firmado para los servicios contratados'
  },
  {
    type: 'identificacion',
    label: 'Identificación Oficial',
    required: false,
    description: 'INE, Pasaporte o Cédula Profesional'
  },
  {
    type: 'comprobante_domicilio',
    label: 'Comprobante de Domicilio',
    required: false,
    description: 'Recibo de servicios no mayor a 3 meses'
  }
];

export function ClientDocumentManager({ 
  clientId, 
  clientName,
  curp = '',
  onCurpUpdate 
}: ClientDocumentManagerProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [curpValue, setCurpValue] = useState(curp);
  
  const [uploadForm, setUploadForm] = useState({
    document_type: '',
    document_name: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchDocuments();
  }, [clientId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          uploader:profiles!client_documents_uploaded_by_fkey(full_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments((data || []).map(doc => ({
        ...doc,
        uploader_name: doc.uploader?.full_name || 'Usuario desconocido'
      })));
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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.document_type) return;

    setUploadingFile(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${clientId}/${uploadForm.document_type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // Save document record
      const { error: insertError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          document_name: uploadForm.document_name || uploadForm.file.name,
          document_type: uploadForm.document_type,
          file_path: fileName,
          uploaded_by: user.id
        });

      if (insertError) throw insertError;

      setIsUploadDialogOpen(false);
      setUploadForm({
        document_type: '',
        document_name: '',
        file: null
      });
      
      fetchDocuments();
      
      toast({
        title: "Documento subido",
        description: "El documento se ha subido correctamente",
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCurpSave = async () => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ curp: curpValue })
        .eq('id', clientId);

      if (error) throw error;

      onCurpUpdate(curpValue);
      
      toast({
        title: "CURP actualizado",
        description: "El CURP se ha guardado correctamente",
      });
    } catch (error) {
      console.error('Error updating CURP:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el CURP",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([filePath]);

      if (storageError) console.error('Storage deletion error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      fetchDocuments();
      
      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const getDocumentStatus = (type: string) => {
    const hasDocument = documents.some(doc => doc.document_type === type);
    const requirement = DOCUMENT_REQUIREMENTS.find(req => req.type === type);
    
    if (type === 'curp') {
      return curpValue ? 'complete' : (requirement?.required ? 'missing' : 'optional');
    }
    
    return hasDocument ? 'complete' : (requirement?.required ? 'missing' : 'optional');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'missing': return 'bg-red-100 text-red-800';
      case 'optional': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4" />;
      case 'missing': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* CURP Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CURP del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="curp">CURP</Label>
              <Input
                id="curp"
                value={curpValue}
                onChange={(e) => setCurpValue(e.target.value.toUpperCase())}
                placeholder="CURP del cliente"
                maxLength={18}
              />
            </div>
            <Button onClick={handleCurpSave} disabled={!curpValue || curpValue === curp}>
              Guardar CURP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Requirements Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Documentación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_REQUIREMENTS.map((requirement) => {
              const status = getDocumentStatus(requirement.type);
              return (
                <div key={requirement.type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <p className="font-medium">{requirement.label}</p>
                      <p className="text-sm text-gray-600">{requirement.description}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(status)}>
                    {status === 'complete' ? 'Completo' : 
                     status === 'missing' ? 'Faltante' : 'Opcional'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Documents Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Subidos
            </CardTitle>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir Nuevo Documento</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="document_type">Tipo de Documento</Label>
                    <Select 
                      value={uploadForm.document_type} 
                      onValueChange={(value) => setUploadForm(prev => ({ ...prev, document_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de documento" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_REQUIREMENTS.map((req) => (
                          <SelectItem key={req.type} value={req.type}>
                            {req.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="document_name">Nombre del Documento</Label>
                    <Input
                      id="document_name"
                      value={uploadForm.document_name}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))}
                      placeholder="Nombre descriptivo del documento"
                    />
                  </div>

                  <div>
                    <Label htmlFor="file">Archivo</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => setUploadForm(prev => ({ 
                        ...prev, 
                        file: e.target.files?.[0] || null,
                        document_name: prev.document_name || e.target.files?.[0]?.name || ''
                      }))}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos permitidos: PDF, JPG, PNG, DOC, DOCX
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={uploadingFile} className="flex-1">
                      {uploadingFile ? "Subiendo..." : "Subir Documento"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay documentos subidos</p>
              <p className="text-sm">Sube los documentos requeridos para el cliente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => {
                const requirement = DOCUMENT_REQUIREMENTS.find(req => req.type === document.document_type);
                return (
                  <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{document.document_name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{requirement?.label || document.document_type}</span>
                          <span>•</span>
                          <span>Por {document.uploader_name}</span>
                          <span>•</span>
                          <span>{format(new Date(document.created_at), "dd/MM/yyyy", { locale: es })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(document.file_path, document.document_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDocument(document.id, document.file_path)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}