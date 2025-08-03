import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MoreHorizontal, FolderOpen, User, Building, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientProjectManager } from "@/components/ClientProjectManager";
import { ClientFormDialog } from "@/components/ClientFormDialogNew";

interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ClientProject {
  id: string;
  project_name: string;
  status: string;
  sales_pipeline_stage: string;
  budget: number;
  service_type: string;
  created_at: string;
}

interface ClientWithProjects extends Client {
  projects: ClientProject[];
  total_projects: number;
  total_budget: number;
}

export default function ClientsNew() {
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [newClientForProject, setNewClientForProject] = useState(false);
  const [selectedExistingClientId, setSelectedExistingClientId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Obtener clientes con sus proyectos
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Para cada cliente, obtener sus proyectos
      const clientsWithProjects = await Promise.all(
        clientsData.map(async (client) => {
          const { data: projects, error: projectsError } = await supabase
            .from('client_projects')
            .select('*')
            .eq('client_id', client.id);

          if (projectsError) {
            console.error('Error fetching projects for client:', client.id, projectsError);
            return {
              ...client,
              projects: [],
              total_projects: 0,
              total_budget: 0
            };
          }

          const totalBudget = projects?.reduce((sum, project) => sum + (project.budget || 0), 0) || 0;

          return {
            ...client,
            projects: projects || [],
            total_projects: projects?.length || 0,
            total_budget: totalBudget
          };
        })
      );

      setClients(clientsWithProjects);
    } catch (error) {
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

  const handleClientSave = () => {
    setShowClientForm(false);
    setSelectedClient(null);
    setNewClientForProject(false);
    fetchClients();
    toast({
      title: "Éxito",
      description: "Cliente guardado exitosamente",
    });
  };

  const handleNewClientWithProject = () => {
    setSelectedClient(null);
    setNewClientForProject(true);
    setShowClientForm(true);
  };

  const handleExistingClientNewProject = () => {
    if (!selectedExistingClientId) {
      toast({
        title: "Error",
        description: "Selecciona un cliente existente",
        variant: "destructive",
      });
      return;
    }
    
    const client = clients.find(c => c.id === selectedExistingClientId);
    if (client) {
      setSelectedClient(client);
      setShowProjectManager(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
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

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <div className="text-lg">Cargando clientes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
          <p className="text-muted-foreground">
            Sistema refactorizado: Cliente → Proyectos independientes
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleNewClientWithProject}>
            <User className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
          
          <div className="flex items-center gap-2">
            <Select value={selectedExistingClientId} onValueChange={setSelectedExistingClientId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cliente existente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={handleExistingClientNewProject}
              disabled={!selectedExistingClientId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredClients.length} clientes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Proyectos</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Último Proyecto</TableHead>
                <TableHead className="w-[50px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const lastProject = client.projects[0]; // Proyectos ya están ordenados por fecha
                
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.full_name}</div>
                        {client.notes && (
                          <div className="text-sm text-muted-foreground">{client.notes}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {client.email && <div>{client.email}</div>}
                        {client.phone && <div>{client.phone}</div>}
                        {client.address && <div className="text-muted-foreground">{client.address}</div>}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {client.total_projects} {client.total_projects === 1 ? 'proyecto' : 'proyectos'}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(client.total_budget)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {lastProject ? (
                        <div>
                          <div className="font-medium">{lastProject.project_name}</div>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {lastProject.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin proyectos</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClient(client);
                              setShowProjectManager(true);
                            }}
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Ver Proyectos
                          </DropdownMenuItem>
                           <DropdownMenuItem
                            onClick={() => {
                              setSelectedClient(client);
                              setNewClientForProject(false);
                              setShowClientForm(true);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Editar Cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(client.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar Cliente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredClients.length === 0 && !loading && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron clientes con ese criterio' : 'Comienza creando tu primer cliente'}
              </p>
              <Button onClick={handleNewClientWithProject}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ClientFormDialog
        open={showClientForm}
        onClose={() => {
          setShowClientForm(false);
          setSelectedClient(null);
          setNewClientForProject(false);
        }}
        client={selectedClient}
        onSave={handleClientSave}
      />

      <Dialog open={showProjectManager} onOpenChange={setShowProjectManager}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gestión de Proyectos</DialogTitle>
            <DialogDescription>
              Administra todos los proyectos del cliente
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <ClientProjectManager
              clientId={selectedClient.id}
              clientName={selectedClient.full_name}
              onProjectSelected={(projectId) => {
                // Aquí podrías redirigir al detalle del proyecto
                
                toast({
                  title: "Proyecto seleccionado",
                  description: `ID del proyecto: ${projectId}`,
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}