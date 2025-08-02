import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Layout from "../components/Layout";
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
  Target
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

export default function Design() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  
  // State management
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<DesignPhase[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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
      
      // Update days elapsed for phases
      updateDaysElapsed();
    }
  }, [projectId]);

  const updateDaysElapsed = async () => {
    try {
      await supabase.rpc('update_design_phase_days_elapsed');
    } catch (error) {
      console.error('Error updating days elapsed:', error);
    }
  };

  const fetchProjectData = async () => {
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
    try {
      const { data, error } = await supabase
        .from("design_phases")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order");

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Create default phases if none exist
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
    try {
      // Ensure sales advisor is in the team first
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

      // Validate required roles
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
      // Get the project's assigned advisor from client_projects
      const { data: projectData, error: projectError } = await supabase
        .from("client_projects")
        .select("assigned_advisor_id")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData?.assigned_advisor_id) return;

      // Check if advisor is already in the team
      const { data: existingMember } = await supabase
        .from("project_team_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", projectData.assigned_advisor_id)
        .single();

      if (!existingMember) {
        // Add the sales advisor to the team
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

      // If marking as completed, set completion date
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

      // Update local state
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
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!projectId) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Proyecto no encontrado</h1>
            <p className="text-muted-foreground">No se ha especificado un ID de proyecto válido.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Breadcrumb Navigation */}
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground transition-colors">
                <Home className="h-4 w-4" />
              </Link>
              <ArrowRight className="h-3 w-3" />
              <span className="text-foreground font-medium">Diseño</span>
              <ArrowRight className="h-3 w-3" />
              <span className="truncate max-w-[200px]">{project?.project_name}</span>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="container mx-auto px-6 py-8">
          <div className="glass-card p-8 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {project?.project_name}
                    </h1>
                    <p className="text-muted-foreground">Módulo de Diseño Arquitectónico</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="px-3 py-1.5 glass-button">
                    <User className="h-4 w-4 mr-2" />
                    {project?.clients?.full_name}
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <Target className="h-4 w-4 mr-2" />
                    {getPhaseProgress()}% Completado
                  </Badge>
                </div>
              </div>
              
              {/* Progress Overview */}
              <div className="glass-card p-6 lg:min-w-[280px]">
                <div className="flex items-center gap-3 mb-3">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Progreso General</span>
                </div>
                <Progress value={getPhaseProgress()} className="h-3 mb-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{phases.filter(p => p.status === 'completed').length} de {phases.length} fases completadas</span>
                  <span>{getPhaseProgress()}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content with Resizable Layout */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[800px] glass-card rounded-xl overflow-hidden">
            {/* Navigation Panel */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <div className="h-full p-6 border-r bg-muted/30">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Navegación
                </h3>
                <nav className="space-y-2">
                  <TabsList className="grid w-full grid-rows-5 h-auto gap-2 bg-transparent p-0">
                    <TabsTrigger 
                      value="phases" 
                      className="w-full justify-start glass-button data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Target className="h-4 w-4 mr-3" />
                      Fases del Diseño
                    </TabsTrigger>
                    <TabsTrigger 
                      value="team"
                      className="w-full justify-start glass-button data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Users className="h-4 w-4 mr-3" />
                      Equipo de Trabajo
                    </TabsTrigger>
                    <TabsTrigger 
                      value="calendar"
                      className="w-full justify-start glass-button data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <CalendarIcon className="h-4 w-4 mr-3" />
                      Calendario
                    </TabsTrigger>
                    <TabsTrigger 
                      value="budget"
                      className="w-full justify-start glass-button data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <DollarSign className="h-4 w-4 mr-3" />
                      Presupuesto
                    </TabsTrigger>
                    <TabsTrigger 
                      value="client-info"
                      className="w-full justify-start glass-button data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <FileUser className="h-4 w-4 mr-3" />
                      Expediente Cliente
                    </TabsTrigger>
                  </TabsList>
                </nav>
                
                {/* Phase Timeline Overview */}
                <div className="mt-8">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                    Timeline de Fases
                  </h4>
                  <div className="space-y-3">
                    {phases.map((phase, index) => (
                      <div key={phase.id} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(phase.status)}`} />
                        <span className={`text-xs ${phase.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {phase.phase_name}
                        </span>
                        {phase.status === 'in_progress' && (
                          <div className="animate-pulse">
                            <PlayCircle className="h-3 w-3 text-primary" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Main Content Panel */}
            <ResizablePanel defaultSize={75}>
              <div className="h-full overflow-auto">
                <Tabs defaultValue="phases" className="h-full">
                  {/* Phases Content */}
                  <TabsContent value="phases" className="m-0 h-full">
                    <div className="p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Fases del Diseño Arquitectónico</h2>
                        <p className="text-muted-foreground">Gestiona el progreso de cada fase del proyecto de diseño</p>
                      </div>

                      {/* Horizontal Timeline */}
                      <div className="mb-8 overflow-x-auto">
                        <div className="flex items-center gap-4 min-w-max pb-4">
                          {phases.map((phase, index) => (
                            <div key={phase.id} className="flex items-center">
                              <div className="flex flex-col items-center min-w-[180px]">
                                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
                                  phase.status === 'completed' ? 'bg-green-500 border-green-500' :
                                  phase.status === 'in_progress' ? 'bg-yellow-500 border-yellow-500' :
                                  'bg-muted border-muted'
                                }`}>
                                  {getStatusIcon(phase.status)}
                                </div>
                                <span className="text-sm font-medium mt-2 text-center">{phase.phase_name}</span>
                                <span className="text-xs text-muted-foreground">Fase {phase.phase_order}</span>
                              </div>
                              {index < phases.length - 1 && (
                                <div className={`h-px w-16 ${
                                  phase.status === 'completed' ? 'bg-green-300' : 'bg-muted'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Phase Details */}
                      <div className="grid gap-6">
                        {phases.map((phase) => (
                          <Card key={phase.id} className="glass-card hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full ${getStatusColor(phase.status)}`} />
                                  <CardTitle className="text-lg">{phase.phase_name}</CardTitle>
                                  <Badge variant="outline">Fase {phase.phase_order}</Badge>
                                </div>
                                <div className="flex items-center gap-4">
                                  {getStatusIcon(phase.status)}
                                  <div className="flex items-center gap-2">
                                    <Timer className="h-4 w-4 text-muted-foreground" />
                                    <span className={`text-sm font-medium ${
                                      phase.days_elapsed > 14 ? 'text-destructive' : 
                                      phase.days_elapsed > 7 ? 'text-orange-500' : 'text-muted-foreground'
                                    }`}>
                                      {phase.days_elapsed || 0} días
                                    </span>
                                    {phase.days_elapsed > 14 && (
                                      <Badge variant="destructive" className="text-xs">Retrasado</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Fecha Estimada</label>
                                  <Input
                                    type="date"
                                    value={phase.estimated_delivery_date || ""}
                                    onChange={(e) => updatePhaseDate(phase.id, e.target.value)}
                                    className="glass-input"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Estado</label>
                                  <Select
                                    value={phase.status}
                                    onValueChange={(value) => updatePhaseStatus(phase.id, value)}
                                  >
                                    <SelectTrigger className="glass-input">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pendiente</SelectItem>
                                      <SelectItem value="in_progress">En Progreso</SelectItem>
                                      <SelectItem value="completed">Completado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Progreso Individual</label>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Progress 
                                      value={phase.status === 'completed' ? 100 : phase.status === 'in_progress' ? 50 : 0} 
                                      className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground min-w-[3ch]">
                                      {phase.status === 'completed' ? '100' : phase.status === 'in_progress' ? '50' : '0'}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Notas y Observaciones</label>
                                <Textarea
                                  value={phase.notes || ""}
                                  onChange={(e) => {
                                    const updatedPhases = phases.map(p =>
                                      p.id === phase.id ? { ...p, notes: e.target.value } : p
                                    );
                                    setPhases(updatedPhases);
                                  }}
                                  onBlur={async () => {
                                    try {
                                      await supabase
                                        .from("design_phases")
                                        .update({ notes: phase.notes })
                                        .eq("id", phase.id);
                                    } catch (error) {
                                      console.error("Error updating notes:", error);
                                    }
                                  }}
                                  placeholder="Agrega notas sobre el progreso de esta fase..."
                                  className="glass-input"
                                  rows={3}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {/* Design Completion Manager */}
                        <DesignCompletionManager 
                          projectId={projectId}
                          phases={phases}
                          onPhaseUpdate={(updatedPhases) => setPhases(updatedPhases)}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Other Tab Contents */}
                  <TabsContent value="team" className="m-0 h-full">
                    <div className="p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Equipo de Trabajo</h2>
                        <p className="text-muted-foreground">Gestiona los miembros del equipo asignados al proyecto</p>
                      </div>
                      <TeamMemberSelector 
                        projectId={projectId} 
                        teamMembers={teamMembers}
                        onTeamUpdate={(members) => setTeamMembers(members)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="calendar" className="m-0 h-full">
                    <div className="p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Calendario del Proyecto</h2>
                        <p className="text-muted-foreground">Visualiza fechas importantes y entregables</p>
                      </div>
                      <DesignCalendar 
                        projectId={projectId} 
                        teamMembers={teamMembers.map(tm => ({
                          id: tm.profile.id,
                          full_name: tm.profile.full_name,
                          avatar_url: tm.profile.avatar_url
                        }))} 
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="budget" className="m-0 h-full">
                    <div className="p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Presupuesto del Proyecto</h2>
                        <p className="text-muted-foreground">Administra el presupuesto y costos del proyecto</p>
                      </div>
                      <ProjectBudgetManager 
                        projectId={projectId}
                        projectName={project?.project_name}
                        clientName={project?.clients?.full_name}
                        onBudgetUpdate={(budget) => {
                          console.log("Budget updated:", budget);
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="client-info" className="m-0 h-full">
                    <div className="p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2">Expediente del Cliente</h2>
                        <p className="text-muted-foreground">Información completa y documentos del cliente</p>
                      </div>
                      <ClientInfoPanel projectId={projectId} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </Layout>
  );
}