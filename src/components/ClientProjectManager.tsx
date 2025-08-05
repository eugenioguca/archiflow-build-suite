import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit, FolderOpen, Users, Calendar, Trash2 } from "lucide-react";
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
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    project_name: '',
    project_description: '',
    budget: '',
    square_meters: '',
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

      const projectData = {
        client_id: clientId,
        project_name: newProject.project_name,
        project_description: newProject.project_description,
        budget: newProject.budget ? parseFloat(newProject.budget.replace(/[^\d]/g, '')) : 0,
        square_meters: newProject.square_meters ? parseFloat(newProject.square_meters) : null,
        service_type: newProject.service_type,
        status: newProject.status,
        sales_pipeline_stage: newProject.sales_pipeline_stage,
        assigned_advisor_id: profile.id
      };

      const { error } = await supabase
        .from('client_projects')
        .insert(projectData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Nuevo proyecto creado exitosamente",
      });

      setShowNewProjectDialog(false);
      setNewProject({
        project_name: '',
        project_description: '',
        budget: '',
        square_meters: '',
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

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    try {
      setDeletingProjectId(projectId);
      console.log(`Iniciando eliminación del proyecto: ${projectName} (${projectId})`);

      // Eliminar payment_plans relacionados
      const { error: paymentPlansError } = await supabase
        .from('payment_plans')
        .delete()
        .eq('client_project_id', projectId);

      if (paymentPlansError) {
        console.warn('Error eliminando planes de pago:', paymentPlansError);
      }

      // Eliminar payment_installments relacionados (aunque deberían eliminarse en cascada)
      const { error: installmentsError } = await supabase
        .from('payment_installments')
        .delete()
        .in('payment_plan_id', 
          await supabase
            .from('payment_plans')
            .select('id')
            .eq('client_project_id', projectId)
            .then(res => res.data?.map(p => p.id) || [])
        );

      if (installmentsError) {
        console.warn('Error eliminando cuotas de pago:', installmentsError);
      }

      // Eliminar client_portal_chat del proyecto
      const { error: portalChatError } = await supabase
        .from('client_portal_chat')
        .delete()
        .eq('project_id', projectId);

      if (portalChatError) {
        console.warn('Error eliminando chat del portal:', portalChatError);
      }

      // Eliminar client_portal_notifications del proyecto
      const { error: portalNotificationsError } = await supabase
        .from('client_portal_notifications')
        .delete()
        .eq('project_id', projectId);

      if (portalNotificationsError) {
        console.warn('Error eliminando notificaciones del portal:', portalNotificationsError);
      }

      // Eliminar documentos del proyecto
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('project_id', projectId);

      if (documentsError) {
        console.warn('Error eliminando documentos:', documentsError);
      }

      // Eliminar expenses del proyecto
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('project_id', projectId);

      if (expensesError) {
        console.warn('Error eliminando gastos:', expensesError);
      }

      // Eliminar incomes del proyecto
      const { error: incomesError } = await supabase
        .from('incomes')
        .delete()
        .eq('project_id', projectId);

      if (incomesError) {
        console.warn('Error eliminando ingresos:', incomesError);
      }

      // Eliminar design_phases del proyecto
      const { error: designPhasesError } = await supabase
        .from('design_phases')
        .delete()
        .eq('project_id', projectId);

      if (designPhasesError) {
        console.warn('Error eliminando fases de diseño:', designPhasesError);
      }

      // Eliminar construction_phases del proyecto
      const { error: constructionPhasesError } = await supabase
        .from('construction_phases')
        .delete()
        .eq('project_id', projectId);

      if (constructionPhasesError) {
        console.warn('Error eliminando fases de construcción:', constructionPhasesError);
      }

      // Eliminar construction_timeline del proyecto
      const { error: timelineError } = await supabase
        .from('construction_timeline')
        .delete()
        .eq('project_id', projectId);

      if (timelineError) {
        console.warn('Error eliminando cronograma:', timelineError);
      }

      // Eliminar construction_budget_items del proyecto
      const { error: budgetItemsError } = await supabase
        .from('construction_budget_items')
        .delete()
        .eq('project_id', projectId);

      if (budgetItemsError) {
        console.warn('Error eliminando elementos del presupuesto:', budgetItemsError);
      }

      // Eliminar construction_equipment del proyecto
      const { error: equipmentError } = await supabase
        .from('construction_equipment')
        .delete()
        .eq('project_id', projectId);

      if (equipmentError) {
        console.warn('Error eliminando equipos:', equipmentError);
      }

      // Eliminar construction_teams del proyecto
      const { error: teamsError } = await supabase
        .from('construction_teams')
        .delete()
        .eq('project_id', projectId);

      if (teamsError) {
        console.warn('Error eliminando equipos de trabajo:', teamsError);
      }

      // Eliminar material_requirements del proyecto
      const { error: materialsError } = await supabase
        .from('material_requirements')
        .delete()
        .eq('project_id', projectId);

      if (materialsError) {
        console.warn('Error eliminando requerimientos de materiales:', materialsError);
      }

      // Finalmente, eliminar el proyecto
      const { error: projectError } = await supabase
        .from('client_projects')
        .delete()
        .eq('id', projectId);

      if (projectError) throw projectError;

      toast({
        title: "Proyecto eliminado",
        description: `El proyecto "${projectName}" y todos sus datos relacionados han sido eliminados`,
      });

      // Recargar la lista de proyectos
      fetchProjects();
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeletingProjectId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatCurrencyInput = (value: string) => {
    // Remover todo excepto números
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Si está vacío, devolver vacío
    if (!numericValue) return '';
    
    // Formatear con comas
    const formatted = new Intl.NumberFormat('es-MX').format(parseInt(numericValue));
    return `$${formatted}`;
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Extraer solo números para almacenar
    const numericValue = rawValue.replace(/[^\d]/g, '');
    setNewProject({...newProject, budget: numericValue});
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Presupuesto Estimado</label>
                  <Input
                    type="text"
                    value={formatCurrencyInput(newProject.budget)}
                    onChange={handleBudgetChange}
                    placeholder="Ej: $1,500,000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Metros Cuadrados</label>
                  <Input
                    type="number"
                    value={newProject.square_meters}
                    onChange={(e) => setNewProject({...newProject, square_meters: e.target.value})}
                    placeholder="250"
                    min="0"
                    step="0.01"
                  />
                </div>
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
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingProjectId === project.id}
                      >
                        {deletingProjectId === project.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente el proyecto "{project.project_name}" y todos sus datos relacionados:
                          <br />
                          <br />
                          • Planes de pago y cuotas
                          <br />
                          • Chat y notificaciones del portal
                          <br />
                          • Documentos y archivos
                          <br />
                          • Gastos e ingresos
                          <br />
                          • Fases de diseño y construcción
                          <br />
                          • Cronogramas y presupuestos
                          <br />
                          • Equipos y materiales
                          <br />
                          <br />
                          El cliente y otros proyectos no se verán afectados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteProject(project.id, project.project_name)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Eliminar proyecto
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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