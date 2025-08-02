import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Eye, Edit, FolderOpen, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientProject {
  id: string;
  project_name: string;
  project_description?: string;
  budget: number;
  status: string;
  sales_pipeline_stage: string;
  service_type: string;
  created_at: string;
  updated_at: string;
  assigned_advisor_id?: string;
  // Otros campos de la tabla que pueden estar presentes
  [key: string]: any;
}

interface Client {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ClientProjectManagerProps {
  clientId: string;
  clientName: string;
  onProjectSelected?: (projectId: string) => void;
}

const statusColors = {
  'potential': 'bg-gray-500',
  'active': 'bg-blue-500',
  'completed': 'bg-green-500',
  'cancelled': 'bg-red-500',
};

const stageColors = {
  'lead': 'bg-yellow-500',
  'en_contacto': 'bg-blue-500',
  'propuesta_enviada': 'bg-purple-500',
  'proyecto_ganado': 'bg-green-500',
  'proyecto_perdido': 'bg-red-500',
};

export const ClientProjectManager: React.FC<ClientProjectManagerProps> = ({
  clientId,
  clientName,
  onProjectSelected
}) => {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: '',
    project_description: '',
    budget: 0,
    service_type: 'diseño',
    status: 'potential' as 'potential' | 'active' | 'existing' | 'completed',
    sales_pipeline_stage: 'nuevo_lead' as 'nuevo_lead' | 'en_contacto' | 'lead_perdido' | 'cliente_cerrado'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [clientId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('No se pudo obtener el perfil del usuario');

      const { error } = await supabase
        .from('client_projects')
        .insert({
          client_id: clientId,
          ...newProject,
          assigned_advisor_id: profile.id
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Nuevo proyecto creado exitosamente",
      });

      setShowNewProjectDialog(false);
      setNewProject({
        project_name: '',
        project_description: '',
        budget: 0,
        service_type: 'diseño',
        status: 'potential',
        sales_pipeline_stage: 'nuevo_lead'
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Cargando proyectos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Proyectos de {clientName}</h3>
          <p className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
          </p>
        </div>
        
        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
              <DialogDescription>
                Nuevo proyecto para {clientName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre del Proyecto</label>
                <Input
                  value={newProject.project_name}
                  onChange={(e) => setNewProject({...newProject, project_name: e.target.value})}
                  placeholder="Casa en Guadalajara"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={newProject.project_description}
                  onChange={(e) => setNewProject({...newProject, project_description: e.target.value})}
                  placeholder="Descripción del proyecto..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Presupuesto Estimado</label>
                <Input
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({...newProject, budget: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Tipo de Servicio</label>
                <Select
                  value={newProject.service_type}
                  onValueChange={(value) => setNewProject({...newProject, service_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diseño">Diseño</SelectItem>
                    <SelectItem value="construccion">Construcción</SelectItem>
                    <SelectItem value="remodelacion">Remodelación</SelectItem>
                    <SelectItem value="consultoria">Consultoría</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateProject}>
                  Crear Proyecto
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{project.project_name}</h4>
                    <Badge 
                      variant="secondary" 
                      className={`text-white ${statusColors[project.status as keyof typeof statusColors]}`}
                    >
                      {project.status}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={`text-white ${stageColors[project.sales_pipeline_stage as keyof typeof stageColors]}`}
                    >
                      {project.sales_pipeline_stage}
                    </Badge>
                  </div>
                  
                  {project.project_description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {project.project_description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>💰 {formatCurrency(project.budget)}</span>
                    <span>🏷️ {project.service_type}</span>
                    <span>📅 {new Date(project.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProjectSelected?.(project.id)}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {projects.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold">No hay proyectos</h3>
                <p className="text-muted-foreground">
                  Crea el primer proyecto para {clientName}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewProjectDialog(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Proyecto
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};