import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, User, MapPin, Calendar, DollarSign } from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
}

interface Project {
  id: string;
  project_name: string;
  client_id: string;
  status: string;
  sales_pipeline_stage: string;
  budget?: number;
  project_location?: string;
  created_at: string;
  clients: Client;
}

interface SalesChatProjectSelectorProps {
  onProjectSelect: (projectId: string) => void;
  selectedProjectId?: string;
}

const statusConfig = {
  nuevo_lead: { label: 'Nuevo Lead', color: 'bg-gray-500' },
  en_contacto: { label: 'En Contacto', color: 'bg-blue-500' },
  propuesta_enviada: { label: 'Propuesta Enviada', color: 'bg-yellow-500' },
  cliente_cerrado: { label: 'Cliente Cerrado', color: 'bg-green-500' }
};

export const SalesChatProjectSelector: React.FC<SalesChatProjectSelectorProps> = ({
  onProjectSelect,
  selectedProjectId
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      // Get current user's profile to find advisor assignments
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id,
          project_name,
          client_id,
          status,
          sales_pipeline_stage,
          budget,
          project_location,
          created_at,
          clients:client_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('assigned_advisor_id', profile.id)
        .in('status', ['potential', 'design', 'construction'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.clients.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (stage: string) => {
    const config = statusConfig[stage as keyof typeof statusConfig] || statusConfig.nuevo_lead;
    return (
      <Badge variant="secondary" className={`${config.color} text-white text-xs`}>
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando proyectos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Seleccionar Proyecto para Chat
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por proyecto o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium">No hay proyectos disponibles</h3>
            <p className="text-muted-foreground">
              No tienes proyectos asignados como asesor de ventas.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProjectId === project.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate mb-1">
                          {project.project_name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          Cliente: {project.clients.full_name}
                        </p>
                      </div>
                      {getStatusBadge(project.sales_pipeline_stage)}
                    </div>

                    <div className="space-y-2">
                      {project.clients.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{project.clients.email}</span>
                        </div>
                      )}
                      
                      {project.project_location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{project.project_location}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>{formatCurrency(project.budget)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(project.created_at).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                    </div>

                    {selectedProjectId === project.id && (
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onProjectSelect(project.id);
                          }}
                        >
                          Acceder al Chat
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};