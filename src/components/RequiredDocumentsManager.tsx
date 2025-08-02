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
  curp?: string;
  constancia_situacion_fiscal_url?: string;
  constancia_situacion_fiscal_uploaded?: boolean;
  sales_pipeline_stage: string;
  clients?: {
    full_name: string;
    email?: string;
  };
}

interface RequiredDocument {
  id: string;
  name: string;
  type: 'curp' | 'fiscal_certificate' | 'contract' | 'payment_plan' | 'id_document' | 'other';
  required_for_stages: string[];
  description: string;
  icon: any;
  validation_pattern?: string;
}

interface RequiredDocumentsManagerProps {
  clientProjectId: string;
  clientProject: ClientProject;
  onDocumentUpdate?: () => void;
}

const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'curp',
    name: 'CURP',
    type: 'curp',
    required_for_stages: ['en_contacto', 'cliente_cerrado'],
    description: 'Clave Única de Registro de Población del cliente',
    icon: User,
    validation_pattern: '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$'
  },
  {
    id: 'fiscal_certificate',
    name: 'Constancia de Situación Fiscal',
    type: 'fiscal_certificate',
    required_for_stages: ['en_contacto', 'cliente_cerrado'],
    description: 'Documento fiscal actualizado del SAT',
    icon: Building
  },
  {
    id: 'contract',
    name: 'Contrato Firmado',
    type: 'contract',
    required_for_stages: ['cliente_cerrado'],
    description: 'Contrato de servicios firmado por el cliente',
    icon: FileText
  },
  {
    id: 'payment_plan',
    name: 'Plan de Pagos',
    type: 'payment_plan',
    required_for_stages: ['cliente_cerrado'],
    description: 'Plan de pagos acordado y autorizado',
    icon: Shield
  }
];

export const RequiredDocumentsManager = ({ 
  clientProjectId, 
  clientProject, 
  onDocumentUpdate 
}: RequiredDocumentsManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [curpValue, setCurpValue] = useState(clientProject.curp || '');
  const [showCurpDialog, setShowCurpDialog] = useState(false);
  const { toast } = useToast();

  const getCurrentStageRequiredDocs = () => {
    return REQUIRED_DOCUMENTS.filter(doc => 
      doc.required_for_stages.includes(clientProject.sales_pipeline_stage)
    );
  };

  const getDocumentStatus = (doc: RequiredDocument) => {
    switch (doc.type) {
      case 'curp':
        return {
          completed: !!clientProject.curp && validateCURP(clientProject.curp),
          value: clientProject.curp,
          canEdit: true
        };
      case 'fiscal_certificate':
        return {
          completed: !!clientProject.constancia_situacion_fiscal_uploaded && !!clientProject.constancia_situacion_fiscal_url,
          value: clientProject.constancia_situacion_fiscal_url,
          canEdit: true
        };
      case 'contract':
        return {
          completed: false, // TODO: Implementar validación de contratos
          value: null,
          canEdit: true
        };
      case 'payment_plan':
        return {
          completed: false, // TODO: Implementar validación de plan de pagos
          value: null,
          canEdit: true
        };
      default:
        return {
          completed: false,
          value: null,
          canEdit: false
        };
    }
  };

  const validateCURP = (curp: string): boolean => {
    const pattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
    return pattern.test(curp);
  };

  const updateCURP = async () => {
    try {
      if (!validateCURP(curpValue)) {
        toast({
          title: "Error",
          description: "El formato del CURP no es válido",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('client_projects')
        .update({ curp: curpValue })
        .eq('id', clientProjectId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "CURP actualizado correctamente",
      });

      setShowCurpDialog(false);
      onDocumentUpdate?.();
    } catch (error) {
      console.error('Error updating CURP:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el CURP",
        variant: "destructive",
      });
    }
  };

  const uploadFiscalCertificate = async (file: File) => {
    try {
      setUploading(true);

      // Subir archivo a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientProjectId}_fiscal_certificate_${Date.now()}.${fileExt}`;
      const filePath = `client-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(filePath);

      // Actualizar registro en la base de datos
      const { error: updateError } = await supabase
        .from('client_projects')
        .update({
          constancia_situacion_fiscal_url: publicUrlData.publicUrl,
          constancia_situacion_fiscal_uploaded: true
        })
        .eq('id', clientProjectId);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: "Constancia de situación fiscal subida correctamente",
      });

      onDocumentUpdate?.();
    } catch (error) {
      console.error('Error uploading fiscal certificate:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la constancia fiscal",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getCompletionPercentage = () => {
    const requiredDocs = getCurrentStageRequiredDocs();
    if (requiredDocs.length === 0) return 100;

    const completedDocs = requiredDocs.filter(doc => getDocumentStatus(doc).completed);
    return Math.round((completedDocs.length / requiredDocs.length) * 100);
  };

  const requiredDocs = getCurrentStageRequiredDocs();
  const completionPercentage = getCompletionPercentage();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documentos Obligatorios
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Completado:</span>
            <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
              {completionPercentage}%
            </Badge>
          </div>
        </div>
        <Progress value={completionPercentage} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {requiredDocs.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium">No hay documentos requeridos</h3>
            <p className="text-muted-foreground">
              Para la fase actual "{clientProject.sales_pipeline_stage}" no se requieren documentos específicos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Cliente: <span className="font-medium">{clientProject.clients?.full_name}</span> • 
              Fase: <span className="font-medium capitalize">{clientProject.sales_pipeline_stage.replace('_', ' ')}</span>
            </div>

            {requiredDocs.map((doc) => {
              const status = getDocumentStatus(doc);
              const Icon = doc.icon;

              return (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${status.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{doc.name}</h4>
                        {status.completed ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                      {status.value && (
                        <p className="text-xs text-blue-600 mt-1">
                          {doc.type === 'curp' ? `CURP: ${status.value}` : 'Archivo subido'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Acciones específicas por tipo de documento */}
                    {doc.type === 'curp' && (
                      <Dialog open={showCurpDialog} onOpenChange={setShowCurpDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            {status.completed ? <Eye className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>CURP del Cliente</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">
                                Clave Única de Registro de Población
                              </label>
                              <Input
                                value={curpValue}
                                onChange={(e) => setCurpValue(e.target.value.toUpperCase())}
                                placeholder="AAAA000000HAAAA00"
                                maxLength={18}
                                className="font-mono"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Formato: 4 letras + 6 números + H/M + 5 letras + 2 números
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={updateCURP} className="flex-1">
                                Guardar
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setShowCurpDialog(false)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {doc.type === 'fiscal_certificate' && (
                      <div className="flex gap-2">
                        {status.completed && status.value && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(status.value as string, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.jpg,.jpeg,.png';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) uploadFiscalCertificate(file);
                            };
                            input.click();
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {doc.type === 'contract' && (
                      <Button variant="outline" size="sm" disabled>
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}

                    {doc.type === 'payment_plan' && (
                      <Button variant="outline" size="sm" disabled>
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Validación para avanzar de fase */}
            {completionPercentage < 100 && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                      Documentos pendientes
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Para avanzar a la siguiente fase del pipeline, es necesario completar todos los documentos obligatorios.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};