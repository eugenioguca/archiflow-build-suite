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
      required_for_stages: ['en_contacto', 'cliente_cerrado'],
      description: 'Clave Única de Registro de Población del cliente',
      icon: User,
      validation_pattern: '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$'
    },
    {
      id: 'fiscal_certificate',
      name: 'Constancia de Situación Fiscal',
      type: 'fiscal_certificate',
      required_for_stages: ['en_contacto', 'cliente_cerrado'],
      description: 'Constancia de situación fiscal vigente',
      icon: Shield
    },
    {
      id: 'contract',
      name: 'Contrato',
      type: 'contract',
      required_for_stages: ['en_contacto', 'cliente_cerrado'],
      description: 'Contrato de servicios firmado por el cliente',
      icon: FileText
    },
    {
      id: 'plan_pagos',
      name: 'Plan de Pagos',
      type: 'plan_pagos',
      required_for_stages: ['en_contacto', 'cliente_cerrado'],
      description: 'Plan de pagos autorizado para transición a diseño',
      icon: Building
    }
  ];

  const currentStage = clientProject?.sales_pipeline_stage || 'nuevo_lead';

  const [planPagosCompleted, setPlanPagosCompleted] = useState(false);

  useEffect(() => {
    const checkPlanPagosStatus = async () => {
      if (currentStage === 'cliente_cerrado') {
        try {
          // Verificar si existe un plan de pagos con la primera parcialidad pagada
          const { data, error } = await supabase
            .from('payment_plans')
            .select(`
              id,
              payment_installments!inner(
                id,
                installment_number,
                status
              )
            `)
            .eq('client_project_id', clientProjectId)
            .eq('plan_type', 'design_payment')
            .eq('is_current_plan', true)
            .eq('payment_installments.installment_number', 1)
            .eq('payment_installments.status', 'paid')
            .limit(1);

          if (error) throw error;
          setPlanPagosCompleted(data && data.length > 0);
        } catch (error) {
          console.error('Error checking plan_pagos status:', error);
        }
      }
    };

    checkPlanPagosStatus();
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
        if (planPagosCompleted) {
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
      // Validate user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Check user profile exists and has proper role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil de usuario no encontrado');
      }

      if (!['admin', 'employee'].includes(profile.role)) {
        throw new Error('No tiene permisos para subir documentos');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${clientProject.client_id}/${clientProjectId}_${docType}_${Date.now()}.${fileExt}`;

      // Upload file to unified project-documents bucket
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      // Map document types for unified documents table
      const documentTypeMapping: Record<string, string> = {
        'curp': 'curp',
        'fiscal_certificate': 'constancia_situacion_fiscal', 
        'contract': 'contract',
        'plan_pagos': 'plan_pagos'
      };

      const departmentMapping: Record<string, string> = {
        'curp': 'legal',
        'fiscal_certificate': 'fiscal', 
        'contract': 'contracts',
        'plan_pagos': 'financial'
      };

      // Insert into unified documents table
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          client_id: clientProject.client_id,
          project_id: clientProjectId,
          name: file.name,
          category: documentTypeMapping[docType] || docType,
          department: departmentMapping[docType] || 'general',
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: profile.id,
          document_status: 'active',
          access_level: 'internal'
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Error al guardar documento: ${insertError.message}`);
      }

      // Update client_projects record for backwards compatibility
      const updates: any = {};
      
      switch (docType) {
        case 'curp':
          updates.curp = 'uploaded'; // Set a value to indicate it's uploaded
          break;
        case 'fiscal_certificate':
          updates.constancia_situacion_fiscal_url = fileName;
          updates.constancia_situacion_fiscal_uploaded = true;
          break;
        case 'contract':
          updates.contract_url = fileName;
          updates.contract_uploaded = true;
          break;
        case 'plan_pagos':
          updates.plan_pagos_url = fileName;
          break;
      }

      const { error: updateError } = await supabase
        .from('client_projects')
        .update(updates)
        .eq('id', clientProjectId);

      if (updateError) throw updateError;

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
                    {!status.uploaded && doc.type !== 'plan_pagos' && (
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
                    {doc.type === 'plan_pagos' && !status.uploaded && (
                      <div className="text-sm text-muted-foreground italic">
                        Se completará automáticamente al pagar la primera parcialidad
                      </div>
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