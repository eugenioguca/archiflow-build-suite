import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, X, Filter } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  projects?: Project[];
}

interface Project {
  id: string;
  project_name: string;
  status: string;
  sales_pipeline_stage: string;
  client_id: string;
  budget?: number;
}

interface ClientProjectSelectorProps {
  selectedClientId?: string;
  selectedProjectId?: string;
  onClientChange: (clientId: string | undefined) => void;
  onProjectChange: (projectId: string | undefined) => void;
  showAllOption?: boolean;
  showProjectFilter?: boolean;
  className?: string;
}

export const ClientProjectSelector: React.FC<ClientProjectSelectorProps> = ({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  showAllOption = true,
  showProjectFilter = true,
  className = ""
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filtrar proyectos basado en cliente seleccionado
    if (selectedClientId) {
      const clientProjects = projects.filter(p => p.client_id === selectedClientId);
      setAvailableProjects(clientProjects);
      
      // Si el proyecto seleccionado no pertenece al cliente, limpiar selección
      if (selectedProjectId && !clientProjects.find(p => p.id === selectedProjectId)) {
        onProjectChange(undefined);
      }
    } else {
      setAvailableProjects(projects);
    }
  }, [selectedClientId, projects, selectedProjectId, onProjectChange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [clientsResult, projectsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name')
          .order('full_name'),
        supabase
          .from('client_projects')
          .select('id, project_name, status, sales_pipeline_stage, client_id, budget')
          .order('project_name')
      ]);

      if (clientsResult.data) {
        setClients(clientsResult.data);
      }
      
      if (projectsResult.data) {
        setProjects(projectsResult.data);
        setAvailableProjects(projectsResult.data);
      }
    } catch (error) {
      console.error('Error fetching clients and projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (value: string) => {
    if (value === 'all') {
      onClientChange(undefined);
      onProjectChange(undefined);
    } else {
      onClientChange(value);
      onProjectChange(undefined); // Reset project when client changes
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      onProjectChange(undefined);
    } else {
      onProjectChange(value);
    }
  };

  const clearFilters = () => {
    onClientChange(undefined);
    onProjectChange(undefined);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'potential': 'bg-gray-500',
      'design': 'bg-blue-500',
      'construction': 'bg-orange-500',
      'completed': 'bg-green-500',
      'cancelled': 'bg-red-500'
    };
    
    return (
      <Badge variant="secondary" className={statusColors[status] || 'bg-gray-500'}>
        {status}
      </Badge>
    );
  };

  const getStageBadge = (stage: string) => {
    const stageColors: Record<string, string> = {
      'nuevo_lead': 'bg-yellow-500',
      'en_contacto': 'bg-blue-500',
      'propuesta_enviada': 'bg-purple-500',
      'negociacion': 'bg-orange-500',
      'cliente_cerrado': 'bg-green-500',
      'perdido': 'bg-red-500'
    };
    
    return (
      <Badge variant="outline" className={stageColors[stage] || 'bg-gray-500'}>
        {stage.replace('_', ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedProject = availableProjects.find(p => p.id === selectedProjectId);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Cliente-Proyecto
          </div>
          {(selectedClientId || selectedProjectId) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cliente Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cliente
          </label>
          <Select
            value={selectedClientId || 'all'}
            onValueChange={handleClientChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {showAllOption && (
                <SelectItem value="all">Todos los clientes</SelectItem>
              )}
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Proyecto Selector */}
        {showProjectFilter && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Proyecto
            </label>
            <Select
              value={selectedProjectId || 'all'}
              onValueChange={handleProjectChange}
              disabled={loading || availableProjects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto..." />
              </SelectTrigger>
              <SelectContent>
                {showAllOption && (
                  <SelectItem value="all">
                    {selectedClientId ? 'Todos los proyectos del cliente' : 'Todos los proyectos'}
                  </SelectItem>
                )}
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.project_name}</span>
                      <div className="flex gap-1 ml-2">
                        {getStatusBadge(project.status)}
                        {getStageBadge(project.sales_pipeline_stage)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Información de selección actual */}
        {(selectedClient || selectedProject) && (
          <div className="space-y-3 pt-3 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Selección Actual:</h4>
            
            {selectedClient && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Cliente: {selectedClient.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Proyectos disponibles: {availableProjects.length}
                </p>
              </div>
            )}
            
            {selectedProject && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Proyecto: {selectedProject.project_name}</p>
                <div className="flex gap-2">
                  {getStatusBadge(selectedProject.status)}
                  {getStageBadge(selectedProject.sales_pipeline_stage)}
                </div>
                {selectedProject.budget && (
                  <p className="text-xs text-muted-foreground">
                    Presupuesto: {formatCurrency(selectedProject.budget)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};