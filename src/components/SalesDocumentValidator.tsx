import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClientDocumentUploader } from './ClientDocumentUploader';

interface SalesDocumentValidatorProps {
  clientId: string;
  clientData: any;
  onClientUpdate: (clientId: string, updates: any) => void;
  onValidationComplete?: () => void;
}

export const SalesDocumentValidator: React.FC<SalesDocumentValidatorProps> = ({
  clientId,
  clientData,
  onClientUpdate,
  onValidationComplete
}) => {
  const [curpInput, setCurpInput] = useState(clientData?.curp || '');
  const [isValidCURP, setIsValidCURP] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const REQUIRED_DOCUMENTS_COUNT = 4; // constancia_fiscal, identificacion, comprobante_domicilio, contrato

  useEffect(() => {
    initializeData();
  }, [clientId, clientData]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      // Check CURP validity
      if (clientData?.curp) {
        setCurpInput(clientData.curp);
        setIsValidCURP(validateCURP(clientData.curp));
      }

      // Get current documents count
      await updateDocumentsCount();
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDocumentsCount = async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('id')
        .eq('client_id', clientId);

      if (error) {
        console.error('Error fetching documents count:', error);
        return;
      }

      const count = data?.length || 0;
      setDocumentsCount(count);
      
      // Check if validation is complete
      checkValidationComplete(count, isValidCURP);
      
    } catch (error) {
      console.error('Error updating documents count:', error);
    }
  };

  const checkValidationComplete = (docsCount: number, curpValid: boolean) => {
    if (docsCount >= REQUIRED_DOCUMENTS_COUNT && curpValid) {
      onValidationComplete?.();
    }
  };

  const validateCURP = (curp: string): boolean => {
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
    return curpRegex.test(curp.toUpperCase());
  };

  const saveCURP = async () => {
    try {
      if (!validateCURP(curpInput)) {
        toast.error('CURP inválido. Verifique el formato.');
        return;
      }

      const { error } = await supabase
        .from('clients')
        .update({ curp: curpInput.toUpperCase() })
        .eq('id', clientId);

      if (error) {
        console.error('Error saving CURP:', error);
        toast.error('Error al guardar CURP');
        return;
      }

      const newCurpValid = true;
      setIsValidCURP(newCurpValid);
      onClientUpdate(clientId, { curp: curpInput.toUpperCase() });
      toast.success('CURP guardado correctamente');
      
      // Check if validation is now complete
      checkValidationComplete(documentsCount, newCurpValid);
      
    } catch (error) {
      console.error('Error in saveCURP:', error);
      toast.error('Error al guardar CURP');
    }
  };

  const handleDocumentUploaded = () => {
    // Refresh documents count when a new document is uploaded
    updateDocumentsCount();
  };

  const totalCompletedCount = documentsCount + (isValidCURP ? 1 : 0);
  const maxPossibleCount = REQUIRED_DOCUMENTS_COUNT + 1; // +1 for CURP
  const isComplete = totalCompletedCount >= maxPossibleCount;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Validación de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando documentos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Validación de Documentos
          </div>
          <Badge variant="outline" className="ml-2">
            {totalCompletedCount}/{maxPossibleCount} Completado
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isComplete && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Se requieren {maxPossibleCount - totalCompletedCount} elementos adicionales para continuar con el proceso de diseño.
            </AlertDescription>
          </Alert>
        )}

        {/* CURP Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">CURP del Cliente</h3>
            {isValidCURP && <Check className="h-5 w-5 text-green-600" />}
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Ingrese CURP (18 caracteres)"
              value={curpInput}
              onChange={(e) => setCurpInput(e.target.value.toUpperCase())}
              maxLength={18}
              className={isValidCURP ? 'border-green-500' : ''}
            />
            <Button 
              onClick={saveCURP}
              disabled={!curpInput || curpInput === clientData?.curp}
              variant={isValidCURP ? 'outline' : 'default'}
            >
              {isValidCURP ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
          
          {curpInput && !validateCURP(curpInput) && (
            <p className="text-sm text-red-600">
              Formato de CURP inválido. Debe contener 18 caracteres.
            </p>
          )}
        </div>

        {/* Documents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Documentos Requeridos</h3>
            <Badge variant="outline">
              {documentsCount}/{REQUIRED_DOCUMENTS_COUNT} Documentos
            </Badge>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Documentos necesarios:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Constancia de Situación Fiscal</li>
              <li>• Identificación Oficial (INE, Pasaporte, Cédula)</li>
              <li>• Comprobante de Domicilio</li>
              <li>• Contrato de Servicios</li>
            </ul>
          </div>

          {/* Use existing ClientDocumentUploader component */}
          <ClientDocumentUploader
            clientId={clientId}
            clientName={clientData?.full_name || 'Cliente'}
            onDocumentUploaded={handleDocumentUploaded}
          />
        </div>

        {/* Success Message */}
        {isComplete && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ¡Excelente! Todos los documentos han sido validados correctamente. El proyecto puede proceder a la fase de diseño.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};