import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface XMLUploaderProps {
  supplierId?: string;
  expenseId?: string;
  onSuccess?: (cfdiData: any) => void;
  className?: string;
}

export function XMLUploader({ supplierId, expenseId, onSuccess, className = "" }: XMLUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [cfdiData, setCfdiData] = useState<any>(null);
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
      setCfdiData(null);
    }
  };

  const processXML = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('xmlFile', uploadedFile);
      if (supplierId) formData.append('supplierId', supplierId);
      if (expenseId) formData.append('expenseId', expenseId);

      const { data, error } = await supabase.functions.invoke('process-cfdi-xml', {
        body: formData,
      });

      if (error) throw error;

      if (data.success) {
        setCfdiData(data.cfdiDocument);
        toast({
          title: "Éxito",
          description: "XML procesado correctamente",
        });
        onSuccess?.(data.cfdiDocument);
      } else {
        throw new Error(data.error || 'Error procesando XML');
      }
    } catch (error) {
      console.error('Error processing XML:', error);
      toast({
        title: "Error",
        description: error.message || "Error procesando el archivo XML",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="xml-file">Archivo XML CFDI</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="xml-file"
            type="file"
            accept=".xml,text/xml"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="flex-1"
          />
          <Button
            onClick={processXML}
            disabled={!uploadedFile || isUploading}
            size="sm"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cfdiData ? (
              <Check className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isUploading ? "Procesando..." : cfdiData ? "Procesado" : "Procesar"}
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

      {cfdiData && (
        <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
          <h4 className="font-semibold text-sm">Información CFDI</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">UUID:</span>
              <p className="text-muted-foreground break-all">{cfdiData.uuid_fiscal}</p>
            </div>
            <div>
              <span className="font-medium">RFC Emisor:</span>
              <p className="text-muted-foreground">{cfdiData.rfc_emisor}</p>
            </div>
            <div>
              <span className="font-medium">Total:</span>
              <p className="text-muted-foreground">${cfdiData.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <span className="font-medium">Forma de Pago:</span>
              <p className="text-muted-foreground">{cfdiData.forma_pago}</p>
            </div>
            <div>
              <span className="font-medium">Fecha:</span>
              <p className="text-muted-foreground">{new Date(cfdiData.fecha_emision).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium">Tipo:</span>
              <p className="text-muted-foreground">{cfdiData.tipo_comprobante}</p>
            </div>
          </div>
          {cfdiData.forma_pago === 'PPD' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
              <p className="text-yellow-800">
                <strong>PPD:</strong> Esta factura requiere complemento de pago
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}