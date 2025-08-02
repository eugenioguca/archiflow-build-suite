import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TeamMemberSelector } from "@/components/TeamMemberSelector";
import { DesignCalendar } from "@/components/DesignCalendar";
import { ProjectBudgetManager } from "@/components/ProjectBudgetManager";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientInfoPanel } from "@/components/ClientInfoPanel";
import { DesignCompletionManager } from "@/components/DesignCompletionManager";
import { 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  PlayCircle,
  Calculator,
  FileUser,
  Timer,
  ArrowRight,
  Home,
  Layers,
  Users,
  DollarSign,
  Target,
  Palette,
  Plus,
  ChevronRight
} from "lucide-react";

interface DesignPhase {
  id: string;
  project_id: string;
  phase_name: string;
  phase_order: number;
  status: string;
  estimated_delivery_date?: string;
  actual_completion_date?: string;
  notes?: string;
  days_elapsed: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  responsibilities?: string;
  profile: {
    id: string;
    full_name: string;
    position?: string;
    department?: string;
    avatar_url?: string;
    skills?: string[];
  };
}

interface Project {
  id: string;
  project_name: string;
  project_description?: string;
  client_id: string;
  clients?: {
    full_name: string;
    email?: string;
    phone?: string;
  };
}

interface ClientProject {
  id: string;
  project_name: string;
  project_description: string | null;
  status: string;
  client: {
    id: string;
    full_name: string;
  };
}

export default function Design() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const { toast } = useToast();
  
  // State management
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<DesignPhase[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Design phases definition
  const designPhases = [
    { name: "Zonificación", order: 1 },
    { name: "Volumetría", order: 2 },
    { name: "Acabados", order: 3 },
    { name: "Renders", order: 4 },
    { name: "Diseño Completado", order: 5 }
  ];

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchDesignPhases();
      fetchTeamMembers();
      updateDaysElapsed();
    } else {
      fetchDesignProjects();
    }
  }, [projectId]);

  const handleSelectProject = (selectedProjectId: string) => {
    setSearchParams({ project: selectedProjectId });
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  const fetchDesignProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select(`
          id,
          project_name,
          project_description,
          status,
          client:clients(id, full_name)
        `)
        .eq('status', 'design')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos de diseño",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDaysElapsed = async () => {
    try {
      await supabase.rpc('update_design_phase_days_elapsed');
    } catch (error) {
      console.error('Error updating days elapsed:', error);
    }
  };

  const fetchProjectData = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from("client_projects")
        .select(`
          *,
          clients (
            full_name,
            email,
            phone
          )
        `)
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Error",
          description: "Proyecto no encontrado",
          variant: "destructive"
        });
        return;
      }
      
      setProject(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información del proyecto",
        variant: "destructive"
      });
    }
  };

  const fetchDesignPhases = async () => {
    if (!projectId) return;
    
    try {
      const { data, error } = await supabase
        .from("design_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order");

      if (error) throw error;
      
      if (!data || data.length === 0) {
        await createDefaultPhases();
      } else {
        setPhases(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las fases del diseño",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPhases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const phasesToCreate = designPhases.map(phase => ({
        project_id: projectId,
        phase_name: phase.name,
        phase_order: phase.order,
        status: phase.order === 1 ? "pending" : "pending",
        created_by: profile.id
      }));

      const { data, error } = await supabase
        .from("design_phases")
        .insert(phasesToCreate)
        .select();

      if (error) throw error;
      setPhases(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron crear las fases predeterminadas",
        variant: "destructive"
      });
    }
  };

  const fetchTeamMembers = async () => {
    if (!projectId) return;
    
    try {
      await ensureSalesAdvisorInTeam();

      const { data, error } = await supabase
        .from("project_team_members")
        .select(`
          id,
          user_id,
          role,
          responsibilities,
          profiles (
            id,
            full_name,
            avatar_url,
            position,
            department,
            skills
          )
        `)
        .eq("project_id", projectId);

      if (error) throw error;

      const members = data?.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role || 'team_member',
        responsibilities: member.responsibilities,
        profile: {
          id: member.profiles.id,
          full_name: member.profiles.full_name,
          avatar_url: member.profiles.avatar_url,
          position: member.profiles.position,
          department: member.profiles.department,
          skills: member.profiles.skills
        }
      })) || [];

      setTeamMembers(members);
      validateTeamComposition(members);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los miembros del equipo",
        variant: "destructive"
      });
    }
  };

  const ensureSalesAdvisorInTeam = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from("client_projects")
        .select("assigned_advisor_id")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData?.assigned_advisor_id) return;

      const { data: existingMember } = await supabase
        .from("project_team_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", projectData.assigned_advisor_id)
        .single();

      if (!existingMember) {
        await supabase
          .from("project_team_members")
          .insert({
            project_id: projectId,
            user_id: projectData.assigned_advisor_id,
            role: "sales_advisor",
            responsibilities: "Asesor de ventas que cerró al cliente"
          });
      }
    } catch (error) {
      console.error("Error ensuring sales advisor in team:", error);
    }
  };

  const validateTeamComposition = (members: any[]) => {
    const architects = members.filter(member => member.role === 'architect');
    const salesAdvisor = members.find(member => member.role === 'sales_advisor');

    if (!salesAdvisor) {
      toast({
        title: "Advertencia",
        description: "No se encontró el asesor de ventas en el equipo",
        variant: "destructive"
      });
    }

    if (architects.length === 0) {
      toast({
        title: "Advertencia",
        description: "Se requiere al menos un arquitecto asignado al proyecto",
        variant: "destructive"
      });
    }
  };

  const updatePhaseStatus = async (phaseId: string, status: string) => {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.actual_completion_date = new Date().toISOString().split('T')[0];
      } else if (status !== 'completed') {
        updateData.actual_completion_date = null;
      }

      const { error } = await supabase
        .from("design_phases")
        .update(updateData)
        .eq("id", phaseId);

      if (error) throw error;

      setPhases(phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, ...updateData }
          : phase
      ));

      toast({
        title: "Estado actualizado",
        description: "El estado de la fase ha sido actualizado exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la fase",
        variant: "destructive"
      });
    }
  };

  const updatePhaseDate = async (phaseId: string, date: string) => {
    try {
      const { error } = await supabase
        .from("design_phases")
        .update({ 
          estimated_delivery_date: date,
          updated_at: new Date().toISOString()
        })
        .eq("id", phaseId);

      if (error) throw error;

      setPhases(phases.map(phase => 
        phase.id === phaseId 
          ? { ...phase, estimated_delivery_date: date }
          : phase
      ));

      toast({
        title: "Fecha actualizada",
        description: "La fecha estimada ha sido actualizada",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha",
        variant: "destructive"
      });
    }
  };

  const getPhaseProgress = () => {
    const completedPhases = phases.filter(phase => phase.status === 'completed').length;
    return phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'pending': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <PlayCircle className="h-5 w-5 text-yellow-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-gray-400" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show project list if no project is selected
  if (!projectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Módulo de Diseño</h1>
            <p className="text-sm text-muted-foreground">Gestiona las fases de diseño de tus proyectos</p>
          </div>
          <Link to="/projects">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Palette className="h-8 w-8 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-2">No hay proyectos en diseño</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Los proyectos con estado "Diseño" o "Planeación" aparecerán aquí
              </p>
              <Link to="/projects">
                <Button>Ver todos los proyectos</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((designProject) => (
              <Card key={designProject.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{designProject.project_name}</CardTitle>
                    <Badge variant="default">
                      Diseño
                    </Badge>
                  </div>
                  <CardDescription>
                    Cliente: {designProject.client?.full_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {designProject.project_description || 'Sin descripción disponible'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        <span>Fases</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        <span>Equipo</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>Cronograma</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSelectProject(designProject.id)}
                    >
                      Abrir
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Show project detail view
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackToList}
          className="p-0 h-auto text-muted-foreground hover:text-foreground"
        >
          Diseño
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{project?.project_name}</span>
      </div>

      {/* Compact Header */}
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{project?.project_name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{project?.clients?.full_name}</span>
                <span>•</span>
                <span>{getPhaseProgress()}% Completado</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {phases.filter(p => p.status === 'completed').length} / {phases.length} Fases
            </Badge>
            <div className="w-24">
              <Progress value={getPhaseProgress()} className="h-1.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-muted h-9">
          <TabsTrigger value="phases" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            Fases
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs">
            <CalendarIcon className="h-3 w-3 mr-1" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            Presupuesto
          </TabsTrigger>
          <TabsTrigger value="client" className="text-xs">
            <FileUser className="h-3 w-3 mr-1" />
            Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phases" className="space-y-4">
          {/* Compact Progress Bar */}
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Progreso de Fases
              </h3>
              <span className="text-sm text-muted-foreground">{getPhaseProgress()}% Completado</span>
            </div>
            <Progress value={getPhaseProgress()} className="h-2" />
          </div>

          {/* Compact Phases Table */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/50">
              <h3 className="font-semibold">Fases de Diseño</h3>
            </div>
            <div className="divide-y">
              {phases.map((phase) => (
                <div key={phase.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(phase.status)}
                      <div className="flex-1">
                        <div className="font-medium">{phase.phase_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Fase {phase.phase_order} • {phase.days_elapsed} días
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <Select 
                          value={phase.status} 
                          onValueChange={(value) => updatePhaseStatus(phase.id, value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="in_progress">En Progreso</SelectItem>
                            <SelectItem value="completed">Completada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-36">
                        <Input
                          type="date"
                          value={phase.estimated_delivery_date || ''}
                          onChange={(e) => updatePhaseDate(phase.id, e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Fecha estimada"
                        />
                      </div>
                      
                      <Badge variant="outline" className={`text-xs ${
                        phase.status === 'completed' ? 'border-green-500 text-green-700' :
                        phase.status === 'in_progress' ? 'border-yellow-500 text-yellow-700' :
                        'border-gray-300 text-gray-600'
                      }`}>
                        {phase.status === 'completed' ? 'Completada' :
                         phase.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Design Completion Manager */}
          <DesignCompletionManager 
            projectId={projectId} 
            phases={phases}
            onPhaseUpdate={fetchDesignPhases}
          />
        </TabsContent>

        <TabsContent value="team">
          <div className="bg-card rounded-lg p-4 border">
            <TeamMemberSelector 
              projectId={projectId} 
              teamMembers={teamMembers}
              onTeamUpdate={setTeamMembers}
            />
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="bg-card rounded-lg p-4 border">
            <DesignCalendar projectId={projectId} teamMembers={teamMembers.map(member => ({
              id: member.profile.id,
              full_name: member.profile.full_name,
              avatar_url: member.profile.avatar_url
            }))} />
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <div className="bg-card rounded-lg p-4 border">
            <ProjectBudgetManager projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="client">
          <div className="bg-card rounded-lg p-4 border">
            <ClientInfoPanel projectId={projectId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}