import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoGallery } from '@/components/PhotoGallery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  Camera, 
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientProject {
  id: string;
  name: string;
  description: string;
  status: string;
  budget: number;
  progress_percentage: number;
  start_date: string;
  estimated_completion: string;
  actual_completion?: string;
  client_id: string;
  location?: string;
  project_manager?: string;
}

interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  budget_allocated: number;
  actual_cost: number;
  progress_percentage: number;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
}

interface ProjectDocument {
  id: string;
  name: string;
  description: string;
  file_path: string;
  file_type: string;
  category: string;
  created_at: string;
}

const ClientPortal: React.FC = () => {
  const { user } = useAuth();
  const [project, setProject] = useState<ClientProject | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    if (!user) return;

    try {
      // Obtener información del cliente y su proyecto
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          full_name,
          email,
          phone,
          address,
          projects (
            id,
            name,
            description,
            status,
            budget,
            progress_percentage,
            start_date,
            estimated_completion,
            actual_completion,
            location
          )
        `)
        .eq('profile_id', (await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()).data?.id)
        .single();

      if (clientError) throw clientError;

      if (clientData && clientData.projects && clientData.projects.length > 0) {
        setProject(clientData.projects[0] as ClientProject);

        // Obtener pagos del proyecto
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('incomes')
          .select('*')
          .eq('project_id', clientData.projects[0].id)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false });

        if (!paymentsError && paymentsData) {
          setPayments(paymentsData.map(payment => ({
            id: payment.id,
            description: payment.description,
            amount: payment.amount,
            payment_date: payment.payment_date || payment.created_at,
            payment_method: payment.forma_pago || 'Transferencia',
            status: payment.payment_status
          })));
        }

        // Obtener documentos del proyecto
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', clientData.projects[0].id)
          .eq('client_id', clientData.id)
          .eq('access_level', 'client')
          .order('created_at', { ascending: false });

        if (!documentsError && documentsData) {
          setDocuments(documentsData);
        }
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { label: 'Planeación', variant: 'secondary' as const, icon: Clock },
      construction: { label: 'Construcción', variant: 'default' as const, icon: Building2 },
      completed: { label: 'Completado', variant: 'default' as const, icon: CheckCircle },
      paused: { label: 'Pausado', variant: 'destructive' as const, icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'outline' as const,
      icon: Clock
    };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No hay proyecto asignado</h2>
            <p className="text-muted-foreground">
              Actualmente no tienes un proyecto asignado. Contacta con el administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header del Proyecto */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-lg text-muted-foreground">{project.description}</p>
            <div className="flex items-center gap-4 mt-4">
              {getStatusBadge(project.status)}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {project.location || 'Ubicación no especificada'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {project.progress_percentage}%
            </div>
            <div className="text-sm text-muted-foreground">Progreso</div>
            <Progress value={project.progress_percentage} className="w-32 mt-2" />
          </div>
        </div>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Fecha de Inicio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(project.start_date), 'dd MMM yyyy', { locale: es })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Finalización Estimada</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(project.estimated_completion), 'dd MMM yyyy', { locale: es })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con información detallada */}
      <Tabs defaultValue="pagos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pagos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Fotos de Avance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay pagos registrados</p>
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })} • {payment.payment_method}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay documentos disponibles</p>
                  </div>
                ) : (
                  documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-muted-foreground">{document.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(document.created_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{document.category}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fotos">
          <Card>
            <CardHeader>
              <CardTitle>Fotos de Avance del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Las fotos de avance se mostrarán aquí</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientPortal;