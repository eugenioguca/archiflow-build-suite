import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Building2, Plus, MapPin, DollarSign, Calendar } from 'lucide-react';

interface ClientProject {
  id: string;
  project_name: string;
  budget: number;
  land_square_meters: number;
  client: {
    full_name: string;
  };
  construction_project?: {
    id: string;
  }[];
}

interface ConstructionProjectSetupProps {
  onProjectCreated: (constructionProjectId: string) => void;
}

export function ConstructionProjectSetup({ onProjectCreated }: ConstructionProjectSetupProps) {
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchClientProjects();
  }, []);

  const fetchClientProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id,
          project_name,
          budget,
          land_square_meters,
          client:clients(full_name),
          construction_project:construction_projects(id)
        `)
        .in('status', ['design_completed', 'construction'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientProjects(data || []);
    } catch (error) {
      console.error('Error fetching client projects:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createConstructionProject = async (clientProjectId: string) => {
    try {
      setCreating(true);
      
      // Call the database function to create construction project
      const { data, error } = await supabase.rpc(
        'create_construction_project_from_client',
        { client_project_id: clientProjectId }
      );

      if (error) throw error;

      const constructionProjectId = data;

      // Insert default budget items
      await supabase.rpc(
        'insert_default_construction_budget_items',
        { project_id_param: constructionProjectId }
      );

      toast({
        title: "Proyecto de construcción creado",
        description: "El proyecto se ha configurado con presupuesto base"
      });

      setOpen(false);
      fetchClientProjects();
      onProjectCreated(constructionProjectId);
    } catch (error) {
      console.error('Error creating construction project:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto de construcción",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const availableProjects = clientProjects.filter(p => !p.construction_project || p.construction_project.length === 0);
  const existingProjects = clientProjects.filter(p => p.construction_project && p.construction_project.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuración de Proyectos de Construcción</h2>
          <p className="text-muted-foreground">
            Convierte proyectos de cliente en proyectos de construcción activos
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableProjects.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Proyecto de Construcción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seleccionar Proyecto de Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Proyecto de Cliente</Label>
                <Select onValueChange={(value) => {
                  const project = availableProjects.find(p => p.id === value);
                  setSelectedProject(project || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_name} - {project.client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedProject.project_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Presupuesto: ${selectedProject.budget?.toLocaleString() || 'No definido'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Terreno: {selectedProject.land_square_meters || 'No definido'} m²</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => selectedProject && createConstructionProject(selectedProject.id)}
                  disabled={!selectedProject || creating}
                >
                  {creating ? 'Creando...' : 'Crear Proyecto' }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Available Projects */}
      {availableProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Proyectos Disponibles para Construcción</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableProjects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="text-base">{project.project_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {project.client.full_name}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Presupuesto:</span>
                      <span className="font-medium">
                        ${project.budget?.toLocaleString() || 'No definido'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Terreno:</span>
                      <span className="font-medium">
                        {project.land_square_meters || 'No definido'} m²
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => createConstructionProject(project.id)}
                      disabled={creating}
                    >
                      {creating ? 'Creando...' : 'Crear Proyecto de Construcción'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Existing Construction Projects */}
      {existingProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Proyectos de Construcción Activos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingProjects.map((project) => (
              <Card key={project.id} className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    {project.project_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {project.client.full_name}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Estado:</span>
                      <span className="font-medium text-green-600">Activo</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => onProjectCreated(project.construction_project![0].id)}
                    >
                      Abrir Proyecto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {availableProjects.length === 0 && existingProjects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay proyectos disponibles</h3>
            <p className="text-muted-foreground text-center">
              Los proyectos deben estar en estado "design_completed" o "construction" 
              para poder crear proyectos de construcción.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
