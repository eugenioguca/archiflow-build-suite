import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  Download,
  Plus,
  Shield,
  User,
  Building
} from "lucide-react";

interface ClientProject {
  id: string;
  client_id: string;
  curp?: string;
  constancia_situacion_fiscal_url?: string;
  constancia_situacion_fiscal_uploaded?: boolean;
  contract_url?: string;
  contract_uploaded?: boolean;
  sales_pipeline_stage: string;
  clients?: {
    full_name: string;
    email?: string;
  };
}

interface RequiredDocument {
  id: string;
  name: string;
  type: 'curp' | 'fiscal_certificate' | 'contract' | 'plan_pagos' | 'id_document' | 'other';
  required_for_stages: string[];
  description: string;
  icon: any;
  validation_pattern?: string;
}

interface RequiredDocumentsManagerProps {
  clientProjectId: string;
  clientProject: ClientProject;
  onDocumentUpdate?: () => void;
  showStageTransitions?: boolean;
}

const RequiredDocumentsManager: React.FC<RequiredDocumentsManagerProps> = ({
  clientProjectId,
  clientProject,
  onDocumentUpdate,
  showStageTransitions = true
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const { toast } = useToast();

  // Define required documents including plan_pagos for cliente_cerrado stage
  const requiredDocuments: RequiredDocument[] = [
    {
      id: 'curp',
      name: 'CURP',
      type: 'curp',
      required_for_stages: ['nuevo_lead', 'en_contacto'],
      description: 'Clave Única de Registro de Población del cliente',
      icon: User,
      validation_pattern: '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$'
    },
    {
      id: 'fiscal_certificate',
      name: 'Constancia de Situación Fiscal',
      type: 'fiscal_certificate',
      required_for_stages: ['en_contacto', 'documentos_recibidos'],
      description: 'Constancia de situación fiscal vigente',
      icon: Shield
    },
    {
      id: 'contract',
      name: 'Contrato',
      type: 'contract',
      required_for_stages: ['documentos_recibidos', 'contrato_firmado'],
      description: 'Contrato de servicios firmado',
      icon: FileText
    },
    {
      id: 'plan_pagos',
      name: 'Plan de Pagos',
      type: 'plan_pagos',
      required_for_stages: ['cliente_cerrado'],
      description: 'Plan de pagos autorizado para transición a diseño',
      icon: Building
    }
  ];

  const currentStage = clientProject?.sales_pipeline_stage || 'nuevo_lead';

  const [planPagosUploaded, setPlanPagosUploaded] = useState(false);

  useEffect(() => {
    const checkPlanPagosDocument = async () => {
      if (currentStage === 'cliente_cerrado') {
        try {
          const { data, error } = await supabase
            .from('client_documents')
            .select('id')
            .eq('project_id', clientProjectId)
            .eq('document_type', 'plan_pagos')
            .limit(1);

          if (error) throw error;
          setPlanPagosUploaded(data && data.length > 0);
        } catch (error) {
          console.error('Error checking plan_pagos document:', error);
        }
      }
    };

    checkPlanPagosDocument();
  }, [clientProjectId, currentStage]);

  const getDocumentStatus = (doc: RequiredDocument) => {
    const isRequired = doc.required_for_stages.includes(currentStage);
    
    switch (doc.type) {
      case 'curp':
        if (clientProject?.curp) {
          return { uploaded: true, status: 'completed', required: isRequired };
        }
        break;
      case 'fiscal_certificate':
        if (clientProject?.constancia_situacion_fiscal_uploaded) {
          return { uploaded: true, status: 'completed', required: isRequired };
        }
        break;
      case 'contract':
        if (clientProject?.contract_uploaded) {
          return { uploaded: true, status: 'completed', required: isRequired };
        }
        break;
      case 'plan_pagos':
        if (planPagosUploaded) {
          return { uploaded: true, status: 'completed', required: isRequired };
        }
        break;
    }
    
    return { uploaded: false, status: 'pending', required: isRequired };
  };

  const calculateProgress = () => {
    const requiredDocs = requiredDocuments.filter(doc => 
      doc.required_for_stages.includes(currentStage)
    );
    
    if (requiredDocs.length === 0) return 100;
    
    const completedDocs = requiredDocs.filter(doc => 
      getDocumentStatus(doc).uploaded
    );
    
    return Math.round((completedDocs.length / requiredDocs.length) * 100);
  };

  const handleFileUpload = async (file: File, docType: string) => {
    setUploadingDoc(docType);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientProjectId}_${docType}_${Date.now()}.${fileExt}`;
      const filePath = `client-documents/${fileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // For plan_pagos, save to client_documents table
      if (docType === 'plan_pagos') {
        // Get current user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profileData) throw new Error('Profile not found');

        // Save to client_documents table
        const { error: dbError } = await supabase
          .from('client_documents')
          .insert({
            client_id: clientProject.client_id,
            project_id: clientProjectId,
            document_name: file.name,
            document_type: 'plan_pagos',
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: profileData.id
          });

        if (dbError) throw dbError;
        setPlanPagosUploaded(true);
      } else {
        // Update client_projects record for other document types
        const updates: any = {};
        
        switch (docType) {
          case 'curp':
            // For CURP, we might want to extract the text content
            // For now, just mark as uploaded
            updates.curp_uploaded = true;
            break;
          case 'fiscal_certificate':
            updates.constancia_situacion_fiscal_url = filePath;
            updates.constancia_situacion_fiscal_uploaded = true;
            break;
          case 'contract':
            updates.contract_url = filePath;
            updates.contract_uploaded = true;
            break;
        }

        const { error: updateError } = await supabase
          .from('client_projects')
          .update(updates)
          .eq('id', clientProjectId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Documento subido exitosamente",
        description: `${requiredDocuments.find(d => d.id === docType)?.name} se ha guardado correctamente.`
      });

      setShowUploadDialog(false);
      setUploadFile(null);
      
      if (onDocumentUpdate) {
        onDocumentUpdate();
      }

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error al subir documento",
        description: "Hubo un problema al guardar el archivo. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const canAdvanceToStage = (targetStage: string): boolean => {
    const requiredDocs = requiredDocuments.filter(doc => 
      doc.required_for_stages.includes(currentStage)
    );
    
    const allCompleted = requiredDocs.every(doc => 
      getDocumentStatus(doc).uploaded
    );
    
    return allCompleted;
  };

  const advanceStage = async (targetStage: string) => {
    try {
      const { error } = await supabase
        .from('client_projects')
        .update({ sales_pipeline_stage: targetStage as any })
        .eq('id', clientProjectId);

      if (error) throw error;

      toast({
        title: "Etapa actualizada",
        description: `El proyecto ha avanzado a: ${targetStage}`
      });

      if (onDocumentUpdate) {
        onDocumentUpdate();
      }

    } catch (error) {
      console.error('Error advancing stage:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la etapa del proyecto.",
        variant: "destructive"
      });
    }
  };

  const progress = calculateProgress();
  const requiredDocsForStage = requiredDocuments.filter(doc => 
    doc.required_for_stages.includes(currentStage)
  );

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Requeridos - {currentStage}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progreso de Documentación</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{requiredDocsForStage.length}</div>
                <p className="text-xs text-muted-foreground">Documentos Requeridos</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {requiredDocsForStage.filter(doc => getDocumentStatus(doc).uploaded).length}
                </div>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {requiredDocsForStage.filter(doc => !getDocumentStatus(doc).uploaded).length}
                </div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requiredDocuments.map((doc) => {
              const status = getDocumentStatus(doc);
              const IconComponent = doc.icon;
              
              return (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{doc.name}</h3>
                        {status.required && (
                          <Badge variant="secondary" className="text-xs">Requerido</Badge>
                        )}
                        {status.uploaded ? (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completado
                          </Badge>
                        ) : status.required ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!status.uploaded && (
                      <Dialog open={showUploadDialog && selectedDocType === doc.id} 
                             onOpenChange={(open) => {
                               setShowUploadDialog(open);
                               if (open) setSelectedDocType(doc.id);
                             }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Upload className="h-4 w-4 mr-1" />
                            Subir
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Subir {doc.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                                Cancelar
                              </Button>
                              <Button 
                                onClick={() => uploadFile && handleFileUpload(uploadFile, doc.id)}
                                disabled={!uploadFile || uploadingDoc === doc.id}
                              >
                                {uploadingDoc === doc.id ? 'Subiendo...' : 'Subir'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Transition */}
      {showStageTransitions && (
        <Card>
          <CardHeader>
            <CardTitle>Avance de Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Etapa actual: <Badge variant="outline">{currentStage}</Badge>
              </p>
              
              {progress === 100 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Documentos completos</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Todos los documentos requeridos han sido completados para esta etapa.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Documentos pendientes</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    Completa todos los documentos requeridos para avanzar a la siguiente etapa.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RequiredDocumentsManager;
export { RequiredDocumentsManager };