import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Timer
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
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Módulo de Diseño</h1>
              <p className="text-muted-foreground">
                {project?.project_name || "Cargando proyecto..."}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <User className="h-4 w-4 mr-2" />
                {project?.clients?.full_name || "Cliente"}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <Calculator className="h-4 w-4 mr-2" />
                {getPhaseProgress()}% Completado
              </Badge>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="phases" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="phases">Fases</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="budget">Presupuesto</TabsTrigger>
            <TabsTrigger value="client-info">
              <FileUser className="h-4 w-4 mr-1" />
              Expediente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phases" className="space-y-6">
            <div className="grid gap-6">
              {phases.map((phase) => (
                <Card key={phase.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(phase.status)}`} />
                      <h3 className="text-lg font-semibold">{phase.phase_name}</h3>
                      <Badge variant="outline" className="ml-2">
                        Fase {phase.phase_order}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusIcon(phase.status)}
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm font-medium ${
                          phase.days_elapsed > 14 ? 'text-red-600' : 
                          phase.days_elapsed > 7 ? 'text-amber-600' : 'text-muted-foreground'
                        }`}>
                          {phase.days_elapsed || 0} días
                        </span>
                        {phase.days_elapsed > 14 && (
                          <Badge variant="destructive" className="text-xs">
                            Retrasado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium">Fecha Estimada</label>
                      <Input
                        type="date"
                        value={phase.estimated_delivery_date || ""}
                        onChange={(e) => updatePhaseDate(phase.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estado</label>
                      <Select
                        value={phase.status}
                        onValueChange={(value) => updatePhaseStatus(phase.id, value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Progreso del Proyecto</label>
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          {getPhaseProgress()}% completado
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 mt-1">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getPhaseProgress()}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Notas</label>
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
                      placeholder="Notas sobre esta fase..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </Card>
              ))}
              
              {/* Design Completion Manager */}
              <DesignCompletionManager 
                projectId={projectId}
                phases={phases}
                onPhaseUpdate={(updatedPhases) => setPhases(updatedPhases)}
              />
            </div>
          </TabsContent>

          <TabsContent value="team">
            <TeamMemberSelector 
              projectId={projectId} 
              teamMembers={teamMembers}
              onTeamUpdate={(members) => setTeamMembers(members)}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <DesignCalendar 
              projectId={projectId} 
              teamMembers={teamMembers.map(tm => ({
                id: tm.profile.id,
                full_name: tm.profile.full_name,
                avatar_url: tm.profile.avatar_url
              }))} 
            />
          </TabsContent>

          <TabsContent value="budget">
            <ProjectBudgetManager 
              projectId={projectId}
              projectName={project?.project_name}
              clientName={project?.clients?.full_name}
              onBudgetUpdate={(budget) => {
                console.log("Budget updated:", budget);
              }}
            />
          </TabsContent>

          <TabsContent value="client-info">
            <ClientInfoPanel projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}