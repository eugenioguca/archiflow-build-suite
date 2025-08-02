import { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Phone, Mail, Users, MapPin, Building, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClientFormDialog } from '@/components/ClientFormDialog';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_projects?: ClientProject[];
}

interface ClientProject {
  id: string;
  project_name: string;
  status: string;
  sales_pipeline_stage: string;
  priority: string;
  budget: number | null;
  service_type: string;
  constancia_situacion_fiscal_uploaded: boolean;
  contract_uploaded: boolean;
  has_existing_design: boolean;
  created_at: string;
  profiles?: {
    id: string;
    display_name: string;
  };
  branch_offices?: {
    id: string;
    name: string;
  };
  commercial_alliances?: {
    id: string;
    name: string;
  };
}

const statusLabels = {
  potential: 'Potencial',
  existing: 'Existente', 
  active: 'Activo',
  completed: 'Finalizado',
  nuevo_lead: 'Nuevo Lead',
  en_contacto: 'En Contacto',
  lead_perdido: 'Lead Perdido',
  cliente_cerrado: 'Cliente Cerrado'
};

const statusColors = {
  potential: 'bg-yellow-100 text-yellow-800',
  existing: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  nuevo_lead: 'bg-yellow-100 text-yellow-800',
  en_contacto: 'bg-orange-100 text-orange-800',
  lead_perdido: 'bg-red-100 text-red-800',
  cliente_cerrado: 'bg-green-100 text-green-800'
};

const leadSourceLabels = {
  website: 'Sitio Web',
  commercial_alliance: 'Alianza Comercial',
  referral: 'Referido',
  social_media: 'Redes Sociales',
  advertisement: 'Publicidad',
  cold_call: 'Llamada en Frío',
  event: 'Evento',
  partner: 'Socio'
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id, 
          full_name, 
          email, 
          phone, 
          address, 
          notes, 
          created_at, 
          updated_at,
          client_projects (
            id,
            project_name,
            status,
            sales_pipeline_stage,
            priority,
            budget,
            service_type,
            constancia_situacion_fiscal_uploaded,
            contract_uploaded,
            has_existing_design,
            created_at,
            profiles:assigned_advisor_id (
              id,
              display_name
            ),
            branch_offices:branch_office_id (
              id,
              name
            ),
            commercial_alliances:alliance_id (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente y todo su expediente? Esta acción eliminará también todos sus proyectos y documentos asociados y no se puede deshacer.')) return;

    try {
      // Primero eliminar documentos del cliente
      const { error: documentsError } = await supabase
        .from('client_documents')
        .delete()
        .eq('client_id', clientId);

      if (documentsError) {
        console.warn('Error eliminando documentos del cliente:', documentsError);
        // No detenemos el proceso por esto, solo advertimos
      }

      // Eliminar documentos en tabla general
      const { error: generalDocsError } = await supabase
        .from('documents')
        .delete()
        .eq('client_id', clientId);

      if (generalDocsError) {
        console.warn('Error eliminando documentos generales del cliente:', generalDocsError);
      }

      // Eliminar proyectos del cliente
      const { error: projectsError } = await supabase
        .from('client_projects')
        .delete()
        .eq('client_id', clientId);

      if (projectsError) {
        console.warn('Error eliminando proyectos del cliente:', projectsError);
      }

      // Finalmente eliminar el cliente
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (clientError) throw clientError;

      toast({
        title: "Cliente eliminado",
        description: "El expediente completo del cliente se eliminó correctamente, incluyendo proyectos y documentos",
      });
      
      fetchClients();
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setIsDialogOpen(false);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone?.includes(searchTerm);
    return matchesSearch; // Removed status filter since it's now in client_projects
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expedientes de Clientes</h1>
          <p className="text-muted-foreground">Administra la cartera completa de clientes con sus expedientes</p>
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Expediente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, teléfono, estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="potential">Potenciales</SelectItem>
            <SelectItem value="existing">Existentes</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="completed">Finalizados</SelectItem>
            <SelectItem value="nuevo_lead">Nuevos Leads</SelectItem>
            <SelectItem value="en_contacto">En Contacto</SelectItem>
            <SelectItem value="lead_perdido">Leads Perdidos</SelectItem>
            <SelectItem value="cliente_cerrado">Clientes Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Expedientes de Clientes</CardTitle>
          <CardDescription>
            {filteredClients.length} expediente(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Expediente creado: {new Date(client.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                   <TableCell>
                    <div className="space-y-1">
                      {client.address && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {client.address}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      Ver proyectos
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      -
                    </div>
                  </TableCell>
                   <TableCell>
                     <Badge variant="secondary">
                       Cliente Base
                     </Badge>
                   </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background z-50">
                        <DropdownMenuItem onClick={() => handleEdit(client)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Expediente
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(client.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredClients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p>No se encontraron expedientes</p>
              <p className="text-sm">Crea el primer expediente de cliente para comenzar</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingClient(null);
        }}
        client={editingClient as any}
        onSave={() => {
          fetchClients();
          setEditingClient(null);
        }}
      />
    </div>
  );
}