import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Check, X, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { DragDropUploader } from '@/components/ui/drag-drop-uploader';

interface PaymentInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  description?: string;
}

interface PaymentProof {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  status: string;
  payment_installment_id: string;
  review_notes?: string;
  reviewed_at?: string;
}

interface ClientPaymentProofUploaderProps {
  clientId: string;
  projectId: string;
}

export const ClientPaymentProofUploader = ({ clientId, projectId }: ClientPaymentProofUploaderProps) => {
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, [clientId, projectId]);

  const fetchData = async () => {
    await Promise.all([fetchInstallments(), fetchPaymentProofs()]);
    setLoading(false);
  };

  const fetchInstallments = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_installments')
        .select(`
          id,
          installment_number,
          amount,
          due_date,
          status,
          description,
          payment_plans!inner(
            client_project_id
          )
        `)
        .eq('payment_plans.client_project_id', projectId)
        .order('installment_number');

      if (error) throw error;
      setInstallments(data || []);
    } catch (error) {
      console.error('Error fetching installments:', error);
    }
  };

  const fetchPaymentProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('client_payment_proofs')
        .select('*')
        .eq('client_id', clientId)
        .eq('project_id', projectId)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setPaymentProofs(data || []);
    } catch (error) {
      console.error('Error fetching payment proofs:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('client-payment-proofs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_payment_proofs',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchPaymentProofs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files);
  };

  const uploadPaymentProof = async () => {
    if (!selectedInstallment || uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona una parcialidad y un archivo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of uploadedFiles) {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${clientId}/${projectId}/payment-proofs/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save payment proof record
        const { error: insertError } = await supabase
          .from('client_payment_proofs')
          .insert({
            client_id: clientId,
            project_id: projectId,
            payment_installment_id: selectedInstallment,
            file_path: fileName,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Éxito",
        description: "Comprobante(s) de pago subido(s) correctamente",
      });

      setUploadedFiles([]);
      setSelectedInstallment('');
      await fetchPaymentProofs();
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el comprobante de pago",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      rejected: { label: 'Rechazado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Comprobante de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Seleccionar Parcialidad
            </label>
            <Select value={selectedInstallment} onValueChange={setSelectedInstallment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la parcialidad correspondiente" />
              </SelectTrigger>
              <SelectContent>
                {installments.map((installment) => (
                  <SelectItem key={installment.id} value={installment.id}>
                    Parcialidad #{installment.installment_number} - {formatCurrency(installment.amount)} 
                    {installment.description && ` (${installment.description})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DragDropUploader
            onFilesSelected={handleFilesSelected}
            accept={{ 
              'image/*': ['.png', '.jpg', '.jpeg'],
              'application/pdf': ['.pdf']
            }}
            multiple={true}
            maxSize={10 * 1024 * 1024} // 10MB
            showPreview={true}
          />

          <Button 
            onClick={uploadPaymentProof} 
            disabled={!selectedInstallment || uploadedFiles.length === 0 || uploading}
            className="w-full"
          >
            {uploading ? 'Subiendo...' : 'Subir Comprobante'}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Proofs History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Comprobantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentProofs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No has subido comprobantes de pago aún
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentProofs.map((proof) => {
                const installment = installments.find(i => i.id === proof.payment_installment_id);
                return (
                  <div key={proof.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{proof.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Parcialidad #{installment?.installment_number} - {installment && formatCurrency(installment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Subido el {format(new Date(proof.upload_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(proof.status)}
                        {getStatusBadge(proof.status)}
                      </div>
                    </div>
                    
                    {proof.status === 'rejected' && proof.review_notes && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800">Motivo del rechazo:</p>
                            <p className="text-sm text-red-700">{proof.review_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};