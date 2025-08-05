import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FileText, Check, X, Clock, Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaymentProof {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  status: string;
  payment_installment_id: string;
  review_notes?: string;
  reviewed_at?: string;
  client_id: string;
  project_id: string;
  file_size?: number;
  payment_installments: {
    installment_number: number;
    amount: number;
    due_date: string;
    payment_plans: {
      client_projects: {
        project_name: string;
        clients: {
          full_name: string;
        };
      };
    };
  };
}

export const ClientPaymentProofManager = () => {
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [filteredProofs, setFilteredProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentProofs();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterProofs();
  }, [paymentProofs, searchTerm, statusFilter]);

  const fetchPaymentProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('client_payment_proofs')
        .select(`
          *,
          payment_installments (
            installment_number,
            amount,
            due_date,
            payment_plans (
              client_projects (
                project_name,
                clients (
                  full_name
                )
              )
            )
          )
        `)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setPaymentProofs(data || []);
    } catch (error) {
      console.error('Error fetching payment proofs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los comprobantes de pago",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('payment-proofs-manager')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_payment_proofs',
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

  const filterProofs = () => {
    let filtered = paymentProofs;

    if (searchTerm) {
      filtered = filtered.filter(proof => 
        proof.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proof.payment_installments?.payment_plans?.client_projects?.clients?.full_name
          ?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proof.payment_installments?.payment_plans?.client_projects?.project_name
          ?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(proof => proof.status === statusFilter);
    }

    setFilteredProofs(filtered);
  };

  const handleReviewProof = async (proofId: string, status: 'approved' | 'rejected', notes?: string) => {
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('client_payment_proofs')
        .update({
          status,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', proofId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: status === 'approved' ? "Comprobante aprobado" : "Comprobante rechazado",
      });

      setSelectedProof(null);
      setReviewNotes('');
      await fetchPaymentProofs();
    } catch (error) {
      console.error('Error reviewing proof:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la revisión",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadProof = async (proof: PaymentProof) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(proof.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = proof.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga exitosa",
        description: "El comprobante se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error downloading proof:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el comprobante",
        variant: "destructive",
      });
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconocido';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestión de Comprobantes de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por cliente, proyecto o archivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="approved">Aprobados</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment Proofs List */}
      <div className="space-y-4">
        {filteredProofs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin comprobantes</h3>
              <p className="text-muted-foreground">
                No hay comprobantes de pago que coincidan con los filtros.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProofs.map((proof) => (
            <Card key={proof.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(proof.status)}
                      <h3 className="font-semibold">{proof.file_name}</h3>
                      {getStatusBadge(proof.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                      <div>
                        <p>Cliente: {proof.payment_installments?.payment_plans?.client_projects?.clients?.full_name}</p>
                        <p>Proyecto: {proof.payment_installments?.payment_plans?.client_projects?.project_name}</p>
                      </div>
                      <div>
                        <p>Parcialidad #{proof.payment_installments?.installment_number}</p>
                        <p>Monto: {proof.payment_installments?.amount && formatCurrency(proof.payment_installments.amount)}</p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Subido el {format(new Date(proof.upload_date), 'dd/MM/yyyy HH:mm', { locale: es })} • {formatFileSize(proof.file_size)}
                    </div>

                    {proof.status === 'rejected' && proof.review_notes && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <strong>Motivo del rechazo:</strong> {proof.review_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadProof(proof)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {proof.status === 'pending' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedProof(proof)}
                          >
                            Revisar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Revisar Comprobante</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium mb-2">Archivo:</p>
                              <p className="text-sm text-muted-foreground">{proof.file_name}</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Notas de revisión (opcional para aprobación, requerido para rechazo)
                              </label>
                              <Textarea
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="Agregar comentarios sobre la revisión..."
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReviewProof(proof.id, 'approved', reviewNotes)}
                                disabled={processing}
                                className="flex-1"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Aprobar
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReviewProof(proof.id, 'rejected', reviewNotes)}
                                disabled={processing || !reviewNotes.trim()}
                                className="flex-1"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};