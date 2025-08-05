import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  Activity
} from 'lucide-react';

interface DesignPhase {
  id: string;
  phase_name: string;
  status: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  days_elapsed?: number;
  created_at: string;
}

interface PaymentInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  payment_date?: string;
  description?: string;
}

interface ProgressPhoto {
  id: string;
  phase_name?: string;
  description?: string;
  created_at: string;
  photo_url: string;
}

interface ClientProjectTimelineProps {
  projectId: string;
  projectStatus: string;
}

export const ClientProjectTimeline: React.FC<ClientProjectTimelineProps> = ({ 
  projectId, 
  projectStatus 
}) => {
  const [designPhases, setDesignPhases] = useState<DesignPhase[]>([]);
  const [paymentInstallments, setPaymentInstallments] = useState<PaymentInstallment[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchTimelineData();
    }
  }, [projectId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      const [designPhasesResult, paymentsResult, photosResult] = await Promise.all([
        // Obtener fases de diseño
        supabase
          .from('design_phases')
          .select('id, phase_name, status, actual_completion_date, days_elapsed, created_at')
          .eq('project_id', projectId)
          .order('phase_order'),

        // Obtener pagos del proyecto
        supabase
          .from('payment_installments')
          .select(`
            id, installment_number, amount, due_date, status, description,
            payment_plans!inner(client_project_id)
          `)
          .eq('payment_plans.client_project_id', projectId)
          .order('installment_number'),

        // Obtener fotos de progreso (temporalmente deshabilitado)
        Promise.resolve({ data: [], error: null })
      ]);

      if (designPhasesResult.data) {
        setDesignPhases(designPhasesResult.data);
      }

      if (paymentsResult.data) {
        setPaymentInstallments(paymentsResult.data);
      }

      if (photosResult.data) {
        setProgressPhotos(photosResult.data);
      }

    } catch (error) {
      console.error('Error fetching timeline data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del timeline',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completado', variant: 'default' as const },
      in_progress: { label: 'En Progreso', variant: 'secondary' as const },
      pending: { label: 'Pendiente', variant: 'outline' as const },
      paid: { label: 'Pagado', variant: 'default' as const },
      overdue: { label: 'Vencido', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'outline' as const };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  // Crear eventos del timeline combinando todas las fuentes
  const timelineEvents = [
    ...designPhases.map(phase => ({
      id: `design-${phase.id}`,
      type: 'design',
      title: phase.phase_name,
      description: `Fase de diseño`,
      date: phase.actual_completion_date || phase.created_at,
      status: phase.status,
      icon: <FileText className="h-4 w-4" />,
      details: {
        days_elapsed: phase.days_elapsed,
        target_date: phase.target_completion_date
      }
    })),
    ...paymentInstallments.map(payment => ({
      id: `payment-${payment.id}`,
      type: 'payment',
      title: `Pago ${payment.installment_number}`,
      description: payment.description || `Cuota de ${formatCurrency(payment.amount)}`,
      date: payment.due_date,
      status: payment.status,
      icon: <TrendingUp className="h-4 w-4" />,
      details: {
        amount: payment.amount,
        due_date: payment.due_date
      }
    })),
    ...progressPhotos.map(photo => ({
      id: `photo-${photo.id}`,
      type: 'photo',
      title: photo.description || 'Foto de progreso',
      description: 'Avance de construcción',
      date: photo.created_at,
      status: 'completed',
      icon: <ImageIcon className="h-4 w-4" />,
      details: {
        photo_url: photo.photo_url
      }
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Timeline del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
            <Activity className="h-5 w-5" />
            Timeline del Proyecto
          </div>
          <Badge variant="outline">
            {timelineEvents.length} eventos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timelineEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="font-medium">No hay eventos registrados</p>
            <p className="text-sm">Los eventos del proyecto aparecerán aquí conforme avance</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background">
                    {getStatusIcon(event.status)}
                  </div>
                  {index < timelineEvents.length - 1 && (
                    <div className="h-6 w-px bg-border mt-2"></div>
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 space-y-2 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {event.icon}
                      <h4 className="font-semibold">{event.title}</h4>
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{event.description}</p>

                  {/* Event-specific details */}
                  {event.type === 'design' && 'days_elapsed' in event.details && event.details.days_elapsed && (
                    <div className="text-xs text-muted-foreground">
                      Duración: {event.details.days_elapsed} días
                    </div>
                  )}

                  {event.type === 'payment' && 'amount' in event.details && event.details.amount && (
                    <div className="text-sm font-medium text-green-600">
                      {formatCurrency(event.details.amount)}
                    </div>
                  )}

                  {event.type === 'photo' && 'photo_url' in event.details && event.details.photo_url && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={event.details.photo_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};