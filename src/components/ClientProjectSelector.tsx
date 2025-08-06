import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, MapPin, Calendar, X } from 'lucide-react';

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
  budget?: number;
  project_location?: string;
  client_id: string;
}

interface ClientProjectSelectorProps {
  selectedClientId: string;
  selectedProjectId: string;
  onClientChange: (clientId: string) => void;
  onProjectChange: (projectId: string) => void;
  showAllOption?: boolean;
  showProjectFilter?: boolean;
}

export const ClientProjectSelector: React.FC<ClientProjectSelectorProps> = ({
  selectedClientId,
  selectedProjectId,
  onClientChange,
  onProjectChange,
  showAllOption = true,
  showProjectFilter = true
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter projects based on selected client
    if (selectedClientId && selectedClientId !== 'all') {
      const clientProjects = projects.filter(p => p.client_id === selectedClientId);
      setAvailableProjects(clientProjects);
      
      // Clear project selection if current project doesn't belong to selected client
      if (selectedProjectId && !clientProjects.find(p => p.id === selectedProjectId)) {
        onProjectChange('');
      }
    } else {
      setAvailableProjects(projects);
    }
  }, [selectedClientId, projects, selectedProjectId, onProjectChange]);

  const fetchData = async () => {
    try {
      const [clientsResult, projectsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name')
          .order('full_name'),
        supabase
          .from('client_projects')
          .select('id, project_name, status, sales_pipeline_stage, budget, project_location, client_id')
          .order('project_name')
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setClients(clientsResult.data || []);
      setProjects(projectsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    const actualClientId = clientId === 'none' ? '' : clientId;
    onClientChange(actualClientId);
    // Clear project when client changes
    if (actualClientId !== selectedClientId) {
      onProjectChange('');
    }
  };

  const handleProjectChange = (projectId: string) => {
    const actualProjectId = projectId === 'none' ? '' : projectId;
    onProjectChange(actualProjectId);
  };

  const clearFilters = () => {
    onClientChange('');
    onProjectChange('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      potential: { label: 'Potencial', color: 'bg-gray-500' },
      design: { label: 'Diseño', color: 'bg-blue-500' },
      construction: { label: 'Construcción', color: 'bg-orange-500' },
      completed: { label: 'Completado', color: 'bg-green-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.potential;
    return (
      <Badge variant="secondary" className={`${config.color} text-white text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const getStageBadge = (stage: string) => {
    const stageConfig = {
      nuevo_lead: { label: 'Lead', color: 'bg-purple-500' },
      en_contacto: { label: 'Contacto', color: 'bg-blue-500' },
      propuesta_enviada: { label: 'Propuesta', color: 'bg-yellow-500' },
      cliente_cerrado: { label: 'Cerrado', color: 'bg-green-500' }
    };
    
    const config = stageConfig[stage as keyof typeof stageConfig] || stageConfig.nuevo_lead;
    return (
      <Badge variant="outline" className={`${config.color} text-white text-xs border-0`}>
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Sin presupuesto';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedProject = availableProjects.find(p => p.id === selectedProjectId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros</CardTitle>
          {(selectedClientId || selectedProjectId) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente</label>
          <Select value={selectedClientId || 'none'} onValueChange={handleClientChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {showAllOption && (
                <SelectItem value="all">Todos los clientes</SelectItem>
              )}
              <SelectItem value="none">Sin filtro</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project Selector */}
        {showProjectFilter && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Proyecto</label>
            <Select 
              value={selectedProjectId || 'none'}
              onValueChange={handleProjectChange}
              disabled={!selectedClientId && !showAllOption}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proyecto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin filtro</SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Selected Client Info */}
        {selectedClient && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{selectedClient.full_name}</span>
            </div>
          </div>
        )}

        {/* Selected Project Info */}
        {selectedProject && (
          <div className="p-3 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{selectedProject.project_name}</span>
              <div className="flex gap-1">
                {getStatusBadge(selectedProject.status)}
                {getStageBadge(selectedProject.sales_pipeline_stage)}
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3" />
                <span>{formatCurrency(selectedProject.budget)}</span>
              </div>
              
              {selectedProject.project_location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{selectedProject.project_location}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};