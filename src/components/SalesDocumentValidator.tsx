import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadClientDocument, uploadProjectDocument, getFileType } from "@/lib/fileUtils";
import { CheckCircle, XCircle, AlertTriangle, Upload, FileText } from "lucide-react";

interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: 'missing' | 'uploaded' | 'validated';
  file_path?: string;
  validation_notes?: string;
}

interface SalesDocumentValidatorProps {
  clientId: string;
  clientData: any;
  onClientUpdate: (updates: any) => void;
  onValidationComplete: () => void;
}

export function SalesDocumentValidator({ 
  clientId, 
  clientData, 
  onClientUpdate, 
  onValidationComplete 
}: SalesDocumentValidatorProps) {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);
  const [curpValue, setCurpValue] = useState(clientData?.curp || "");
  const [isValidatingCurp, setIsValidatingCurp] = useState(false);

  useEffect(() => {
    initializeRequirements();
  }, [clientId, clientData]);

  const initializeRequirements = async () => {
    // Check existing documents for this client/project from both tables
    const [documentsResult, clientDocumentsResult] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .eq('document_status', 'active'),
      supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
    ]);

    const documents = documentsResult.data || [];
    const clientDocuments = clientDocumentsResult.data || [];

    const baseRequirements: DocumentRequirement[] = [
      {
        id: 'curp',
        name: 'CURP',
        description: 'Clave Única de Registro de Población del cliente',
        required: true,
        status: clientData?.curp ? 'validated' : 'missing'
      },
      {
        id: 'constancia_fiscal',
        name: 'Constancia de Situación Fiscal',
        description: 'Documento del SAT que acredita la situación fiscal del cliente',
        required: true,
        status: 'missing'
      },
      {
        id: 'identificacion',
        name: 'Identificación Oficial',
        description: 'INE, pasaporte o cédula profesional',
        required: true,
        status: 'missing'
      },
      {
        id: 'comprobante_domicilio',
        name: 'Comprobante de Domicilio',
        description: 'Recibo de luz, agua, teléfono o predial (no mayor a 3 meses)',
        required: true,
        status: 'missing'
      },
      {
        id: 'contrato_firmado',
        name: 'Contrato Firmado',
        description: 'Contrato de servicios firmado por el cliente',
        required: true,
        status: 'missing'
      }
    ];

    // Update status based on existing documents from both sources
    baseRequirements.forEach(req => {
      // Check documents table first
      const doc = documents.find(d => 
        d.name.toLowerCase().includes(req.id.replace('_', ' ')) ||
        d.category === req.id ||
        d.tags?.includes(req.id)
      );
      
      // Check client_documents table
      const clientDoc = clientDocuments.find(d => 
        d.document_type === req.id ||
        d.document_name.toLowerCase().includes(req.id.replace('_', ' '))
      );
      
      if (doc || clientDoc) {
        req.status = 'uploaded';
        req.file_path = doc?.file_path || clientDoc?.file_path;
      }
    });

    setRequirements(baseRequirements);
  };

  const validateCURP = (curp: string): boolean => {
    // Basic CURP validation pattern
    const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
    return curpPattern.test(curp.toUpperCase());
  };

  const saveCURP = async () => {
    if (!curpValue.trim()) {
      toast({
        title: "Error",
        description: "El CURP es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!validateCURP(curpValue)) {
      toast({
        title: "Error",
        description: "El formato del CURP no es válido",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCurp(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ curp: curpValue.toUpperCase() })
        .eq('id', clientId);

      if (error) throw error;

      // Update local state
      onClientUpdate({ curp: curpValue.toUpperCase() });
      
      // Update requirements
      setRequirements(prev => prev.map(req => 
        req.id === 'curp' 
          ? { ...req, status: 'validated' }
          : req
      ));

      toast({
        title: "Éxito",
        description: "CURP guardado y validado correctamente",
      });
    } catch (error) {
      console.error('Error saving CURP:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el CURP",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCurp(false);
    }
  };

  const handleDocumentUpload = async (file: File, requirementId: string) => {
    console.log('🔄 Starting document upload:', { file: file.name, requirementId, clientId });
    
    if (!clientId) {
      console.error('❌ No client ID provided');
      toast({
        title: "Error",
        description: "No se puede subir el documento: Cliente no identificado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ User not authenticated');
        throw new Error('Usuario no autenticado');
      }

      console.log('✅ User authenticated:', user.id);

      let filePath: string;

      // Documentos sensibles van a client_documents bucket
      if (['constancia_fiscal', 'identificacion'].includes(requirementId)) {
        console.log('📋 Uploading sensitive document to client_documents');
        
        const result = await uploadClientDocument(
          file, 
          clientId, 
          clientData?.full_name || 'Cliente', 
          requirementId
        );
        filePath = result.filePath;
        console.log('✅ File uploaded to storage:', filePath);

        // Get the current user's profile to use as uploaded_by
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!profile) {
          throw new Error('No se pudo obtener el perfil del usuario');
        }
        
        // Also save to client_documents table for sensitive docs
        const insertData = {
          client_id: clientId,
          document_type: requirementId,
          document_name: file.name,
          file_path: filePath,
          file_type: getFileType(file.name).type,
          file_size: file.size,
          uploaded_by: profile.id
        };
        
        console.log('💾 Inserting to client_documents table:', insertData);
        
        const { error: insertError } = await supabase
          .from('client_documents')
          .insert(insertData);

        if (insertError) {
          console.error('❌ Error inserting to client_documents:', insertError);
          throw new Error(`Error guardando documento: ${insertError.message}`);
        }
        
        console.log('✅ Successfully inserted to client_documents table');
      } else {
        console.log('📄 Uploading project document');
        
        // Get or create project for non-sensitive documents
        let projectId = clientData?.project_id;
        
        if (!projectId) {
          console.log('🔍 Looking for existing project for client');
          // Check if client has an existing project
          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id')
            .eq('client_id', clientId)
            .limit(1);
          
          if (projectsError) {
            console.error('❌ Error fetching projects:', projectsError);
            throw new Error('No se pudo verificar proyectos existentes');
          }
          
          if (projects && projects.length > 0) {
            projectId = projects[0].id;
            console.log('✅ Found existing project:', projectId);
          } else {
            console.log('🆕 Creating new project for client');
            
            // Get the current user's profile to use as created_by
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', user.id)
              .single();
            
            if (!profile) {
              throw new Error('No se pudo obtener el perfil del usuario');
            }
            
            // Create a basic project for the client
            const { data: newProject, error: projectError } = await supabase
              .from('projects')
              .insert({
                name: `Proyecto para ${clientData?.full_name || 'Cliente'}`,
                client_id: clientId,
                status: 'planning',
                created_by: profile.id
              })
              .select('id')
              .single();
            
            if (projectError) {
              console.error('❌ Error creating project:', projectError);
              throw new Error(`No se pudo crear el proyecto: ${projectError.message}`);
            }
            
            if (!newProject) {
              throw new Error('No se recibió respuesta al crear el proyecto');
            }
            
            projectId = newProject.id;
            console.log('✅ Created new project:', projectId);
          }
        }

        // Documentos del proyecto van al bucket público
        const result = await uploadProjectDocument(file, projectId, 'sales');
        filePath = result.filePath;
        console.log('✅ File uploaded to project storage:', filePath);

        // Get the current user's profile to use as uploaded_by
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!profile) {
          throw new Error('No se pudo obtener el perfil del usuario');
        }
        
        // Save to documents table
        const insertData = {
          project_id: projectId,
          client_id: clientId,
          name: file.name,
          file_path: filePath,
          file_type: getFileType(file.name).type,
          file_size: file.size,
          category: requirementId,
          tags: [requirementId],
          department: 'sales',
          uploaded_by: profile.id,
          access_level: 'internal'
        };
        
        console.log('💾 Inserting to documents table:', insertData);
        
        const { error: insertError } = await supabase
          .from('documents')
          .insert(insertData);

        if (insertError) {
          console.error('❌ Error inserting to documents:', insertError);
          throw new Error(`Error guardando documento: ${insertError.message}`);
        }
        
        console.log('✅ Successfully inserted to documents table');
      }

      await markDocumentAsUploaded(requirementId, filePath);
      console.log('✅ Document marked as uploaded');
      
      toast({
        title: "Documento subido",
        description: `${file.name} se ha subido correctamente`,
      });
    } catch (error) {
      console.error('❌ Error uploading document:', error);
      toast({
        title: "Error",
        description: `No se pudo subir el documento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: "destructive",
      });
    }
  };

  const markDocumentAsUploaded = async (requirementId: string, filePath: string) => {
    console.log('📝 Marking document as uploaded:', { requirementId, filePath });
    
    setRequirements(prev => {
      const updatedReqs = prev.map(req => 
        req.id === requirementId 
          ? { ...req, status: 'uploaded' as const, file_path: filePath }
          : req
      );
      
      console.log('📊 Updated requirements:', updatedReqs.map(r => ({ id: r.id, status: r.status })));
      
      // Check if all requirements are met using the fresh state
      const allComplete = updatedReqs.every(req => 
        !req.required || req.status === 'uploaded' || req.status === 'validated'
      );
      
      console.log('✅ All requirements complete?', allComplete);
      
      if (allComplete) {
        console.log('🎉 All documents complete - triggering validation complete');
        onValidationComplete();
      }
      
      return updatedReqs;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated':
      case 'uploaded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'missing':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return <Badge className="bg-green-100 text-green-800">Validado</Badge>;
      case 'uploaded':
        return <Badge className="bg-blue-100 text-blue-800">Subido</Badge>;
      case 'missing':
        return <Badge variant="destructive">Faltante</Badge>;
      default:
        return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  const completedCount = requirements.filter(req => 
    req.status === 'validated' || req.status === 'uploaded'
  ).length;
  const totalRequired = requirements.filter(req => req.required).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Legales Requeridos
          </CardTitle>
          <Badge variant={completedCount === totalRequired ? "default" : "outline"}>
            {completedCount}/{totalRequired} Completado
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Alert */}
        {completedCount < totalRequired && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Se requieren {totalRequired - completedCount} documentos adicionales antes de poder cerrar el cliente.
            </AlertDescription>
          </Alert>
        )}

        {/* CURP Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(requirements.find(r => r.id === 'curp')?.status || 'missing')}
            <Label htmlFor="curp" className="text-base font-medium">
              CURP (Clave Única de Registro de Población)
            </Label>
            {getStatusBadge(requirements.find(r => r.id === 'curp')?.status || 'missing')}
          </div>
          <div className="flex gap-2">
            <Input
              id="curp"
              value={curpValue}
              onChange={(e) => setCurpValue(e.target.value.toUpperCase())}
              placeholder="Ejemplo: XAXX010101HNEXXXA4"
              maxLength={18}
              className="font-mono"
            />
            <Button 
              onClick={saveCURP} 
              disabled={isValidatingCurp || !curpValue.trim()}
              variant="outline"
            >
              {isValidatingCurp ? "Validando..." : "Validar"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Formato: 4 letras + 6 números + H/M + 5 letras + 2 números
          </p>
        </div>

        {/* Document Requirements */}
        <div className="space-y-4">
          <h4 className="font-medium">Documentos Pendientes</h4>
          {requirements.filter(req => req.id !== 'curp').map((requirement) => (
            <div key={requirement.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(requirement.status)}
                <div>
                  <h5 className="font-medium">{requirement.name}</h5>
                  <p className="text-sm text-muted-foreground">{requirement.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusBadge(requirement.status)}
                {requirement.status === 'missing' && (
                  <div className="relative">
                    <input
                      type="file"
                      id={`upload-${requirement.id}`}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocumentUpload(file, requirement.id);
                        }
                        // Reset input
                        e.target.value = '';
                      }}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Completion Status */}
        {completedCount === totalRequired && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ¡Todos los documentos legales están completos! El cliente puede ser cerrado.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}