import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
    // Check existing documents for this client/project
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .or(`client_id.eq.${clientId},project_id.in.(${clientData?.project_id || 'null'})`)
      .eq('document_status', 'active');

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

    // Update status based on existing documents
    if (documents) {
      baseRequirements.forEach(req => {
        const doc = documents.find(d => 
          d.name.toLowerCase().includes(req.id.replace('_', ' ')) ||
          d.category === req.id ||
          d.tags?.includes(req.id)
        );
        
        if (doc) {
          req.status = 'uploaded';
          req.file_path = doc.file_path;
        }
      });
    }

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

  const markDocumentAsUploaded = async (requirementId: string, filePath: string) => {
    setRequirements(prev => prev.map(req => 
      req.id === requirementId 
        ? { ...req, status: 'uploaded', file_path: filePath }
        : req
    ));

    // Check if all requirements are met
    const updatedReqs = requirements.map(req => 
      req.id === requirementId 
        ? { ...req, status: 'uploaded' as const }
        : req
    );

    const allComplete = updatedReqs.every(req => 
      !req.required || req.status === 'uploaded' || req.status === 'validated'
    );

    if (allComplete) {
      onValidationComplete();
    }
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // This will trigger the ProjectDocumentManager upload for this specific document type
                      toast({
                        title: "Información",
                        description: `Use el gestor de documentos para subir: ${requirement.name}`,
                      });
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </Button>
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