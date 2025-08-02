import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            <Home className="h-4 w-4" />
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Diseño</span>
          <ArrowRight className="h-3 w-3" />
          <span className="truncate max-w-[200px]">{project?.project_name}</span>
        </div>

        {/* Header Section */}
        <div className="bg-card rounded-lg p-6 mb-6 border">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{project?.project_name}</h1>
                  <p className="text-muted-foreground">Módulo de Diseño Arquitectónico</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="px-3 py-1">
                  <User className="h-4 w-4 mr-2" />
                  {project?.clients?.full_name}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  <Target className="h-4 w-4 mr-2" />
                  {getPhaseProgress()}% Completado
                </Badge>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="bg-muted/50 rounded-lg p-4 lg:min-w-[280px]">
              <div className="flex items-center gap-3 mb-3">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="font-medium">Progreso General</span>
              </div>
              <Progress value={getPhaseProgress()} className="h-2 mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Fases completadas</span>
                <span>{phases.filter(p => p.status === 'completed').length} / {phases.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="phases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-muted">
            <TabsTrigger value="phases" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Fases
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipo
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Presupuesto
            </TabsTrigger>
            <TabsTrigger value="client" className="flex items-center gap-2">
              <FileUser className="h-4 w-4" />
              Cliente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phases" className="space-y-6">
            {/* Horizontal Timeline */}
            <div className="bg-card rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Timeline de Fases de Diseño
              </h2>
              
              <div className="relative">
                <div className="flex justify-between items-center mb-8">
                  {phases.slice(0, 4).map((phase, index) => (
                    <div key={phase.id} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full border-2 ${
                        phase.status === 'completed' 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : phase.status === 'in_progress'
                          ? 'bg-yellow-500 border-yellow-500 text-white'
                          : 'bg-background border-muted text-muted-foreground'
                      } flex items-center justify-center font-semibold text-sm`}>
                        {index + 1}
                      </div>
                      <div className="text-center mt-2 max-w-[120px]">
                        <div className="font-medium text-sm">{phase.phase_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {phase.days_elapsed} días
                        </div>
                      </div>
                      {index < 3 && (
                        <div className={`absolute top-4 w-full h-0.5 ${
                          phases[index + 1]?.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                        }`} 
                        style={{
                          left: `${((index + 1) / 4) * 100}%`,
                          width: `${(1 / 4) * 100}%`,
                          transform: 'translateX(-50%)'
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Phase Cards */}
            <div className="grid gap-6">
              {phases.map((phase) => (
                <Card key={phase.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(phase.status)}
                        <div>
                          <CardTitle className="text-lg">{phase.phase_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Fase {phase.phase_order} • {phase.days_elapsed} días transcurridos
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${
                        phase.status === 'completed' ? 'border-green-500 text-green-700' :
                        phase.status === 'in_progress' ? 'border-yellow-500 text-yellow-700' :
                        'border-gray-300 text-gray-600'
                      }`}>
                        {phase.status === 'completed' ? 'Completada' :
                         phase.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Estado</label>
                        <Select 
                          value={phase.status} 
                          onValueChange={(value) => updatePhaseStatus(phase.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="in_progress">En Progreso</SelectItem>
                            <SelectItem value="completed">Completada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Fecha Estimada</label>
                        <Input
                          type="date"
                          value={phase.estimated_delivery_date || ''}
                          onChange={(e) => updatePhaseDate(phase.id, e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Fecha de Finalización</label>
                        <Input
                          type="date"
                          value={phase.actual_completion_date || ''}
                          disabled
                          className="bg-muted/50"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Notas</label>
                      <Textarea
                        placeholder="Agregar notas sobre esta fase..."
                        value={phase.notes || ''}
                        className="min-h-[80px]"
                        readOnly
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Design Completion Manager */}
            <div className="mt-8">
              <DesignCompletionManager 
                projectId={projectId} 
                phases={phases}
                onPhaseUpdate={fetchDesignPhases}
              />
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="bg-card rounded-lg p-6 border">
              <TeamMemberSelector 
                projectId={projectId} 
                teamMembers={teamMembers}
                onTeamUpdate={setTeamMembers}
              />
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="bg-card rounded-lg p-6 border">
              <DesignCalendar projectId={projectId} teamMembers={teamMembers.map(member => ({
                id: member.profile.id,
                full_name: member.profile.full_name,
                avatar_url: member.profile.avatar_url
              }))} />
            </div>
          </TabsContent>

          <TabsContent value="budget">
            <div className="bg-card rounded-lg p-6 border">
              <ProjectBudgetManager projectId={projectId} />
            </div>
          </TabsContent>

          <TabsContent value="client">
            <div className="bg-card rounded-lg p-6 border">
              <ClientInfoPanel projectId={projectId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}