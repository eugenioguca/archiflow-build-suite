import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface PaymentComplementUploaderProps {
  cfdiDocumentId?: string;
  onSuccess?: (complementData: any) => void;
  className?: string;
}

export function PaymentComplementUploader({ cfdiDocumentId, onSuccess, className = "" }: PaymentComplementUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [complementData, setComplementData] = useState<any>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/xml' && !file.name.toLowerCase().endsWith('.xml')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo XML válido",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
      setComplementData(null);
    }
  };

  const processComplement = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('xmlFile', uploadedFile);
      if (cfdiDocumentId) formData.append('cfdiDocumentId', cfdiDocumentId);

      const { data, error } = await supabase.functions.invoke('process-payment-complement', {
        body: formData,
      });

      if (error) throw error;

      if (data.success) {
        setComplementData(data.complement);
        toast({
          title: "Complemento procesado",
          description: "El complemento de pago ha sido registrado correctamente",
        });
        onSuccess?.(data.complement);
      } else {
        throw new Error(data.error || 'Error procesando complemento');
      }
    } catch (error) {
      console.error('Error processing complement:', error);
      toast({
        title: "Error",
        description: error.message || "Error procesando el complemento de pago",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Cargar Complemento de Pago
        </CardTitle>
        <CardDescription>
          Sube el XML del complemento de pago para registrar el pago recibido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="complement-file">Archivo XML Complemento</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="complement-file"
              type="file"
              accept=".xml,text/xml"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              onClick={processComplement}
              disabled={!uploadedFile || isUploading}
              size="sm"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : complementData ? (
                <Check className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? "Procesando..." : complementData ? "Procesado" : "Procesar"}
            </Button>
          </div>
        </div>

        {uploadedFile && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{uploadedFile.name}</span>
            <span>({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}

        {complementData && (
          <div className="rounded-lg border p-4 space-y-3 bg-green-50 border-green-200">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold text-sm text-green-800">Complemento Registrado</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">UUID Complemento:</span>
                <p className="text-muted-foreground break-all">{complementData.complement_uuid}</p>
              </div>
              <div>
                <span className="font-medium">Monto Pago:</span>
                <p className="text-muted-foreground">${complementData.monto_pago?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="font-medium">Fecha Pago:</span>
                <p className="text-muted-foreground">{new Date(complementData.fecha_pago).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium">Forma de Pago:</span>
                <p className="text-muted-foreground">{complementData.forma_pago}</p>
              </div>
              {complementData.original_cfdi && (
                <>
                  <div className="col-span-2">
                    <span className="font-medium">CFDI Original:</span>
                    <p className="text-muted-foreground break-all">{complementData.original_cfdi.uuid_fiscal}</p>
                  </div>
                </>
              )}
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Complemento validado y registrado
            </Badge>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-blue-800">
              <p className="font-medium">Información importante:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• El complemento debe corresponder a un CFDI registrado en el sistema</li>
                <li>• Se validará automáticamente contra el UUID del CFDI original</li>
                <li>• Una vez procesado, se actualizará el estado del pago</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}