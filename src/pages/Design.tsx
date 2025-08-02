import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { TeamMemberSelector } from "@/components/TeamMemberSelector";
import { DesignCalendar } from "@/components/DesignCalendar";
import { ProjectBudgetManager } from "@/components/ProjectBudgetManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Palette, 
  Calendar as CalendarIcon, 
  Clock, 
  FileText, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DesignPhase {
  id: string;
  phase_name: string;
  phase_order: number;
  status: string;
  estimated_delivery_date?: string;
  actual_completion_date?: string;
  days_elapsed: number;
  notes?: string;
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
  name: string;
  description?: string;
  client_id: string;
  status: string;
  clients: {
    full_name: string;
    email?: string;
    phone?: string;
  };
}

export default function Design() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<DesignPhase[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const designPhases = [
    { name: "zonificacion", label: "Zonificación", order: 1 },
    { name: "volumetria", label: "Volumetría", order: 2 },
    { name: "acabados", label: "Acabados", order: 3 },
    { name: "ajustes", label: "Ajustes", order: 4 },
    { name: "renders", label: "Renders", order: 5 },
    { name: "completado", label: "Diseño Completado", order: 6 }
  ];

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchDesignPhases();
      fetchTeamMembers();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          clients (
            full_name,
            email,
            phone
          )
        `)
        .eq("id", projectId)
        .single();

      if (error) throw error;
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
        description: "No se pudieron crear las fases del diseño",
        variant: "destructive"
      });
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // First, get the project's client and their assigned advisor
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`
          client_id,
          clients (
            assigned_advisor_id,
            profiles (
              id,
              full_name,
              position,
              department,
              avatar_url,
              skills
            )
          )
        `)
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      // Get current team members
      const { data, error } = await supabase
        .from("project_team_members")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            position,
            department,
            avatar_url,
            skills
          )
        `)
        .eq("project_id", projectId)
        .eq("is_active", true);

      if (error) throw error;

      let teamMembersData = data || [];

      // Check if sales advisor is in the team (from client_projects)
      const salesAdvisorId = projectData?.assigned_advisor_id;
      if (salesAdvisorId) {
        const salesAdvisorInTeam = teamMembersData.find(
          member => member.user_id === salesAdvisorId && member.role === "sales_advisor"
        );

        // If sales advisor is not in the team, add them automatically
        if (!salesAdvisorInTeam) {
          try {
            const { data: newMember, error: insertError } = await supabase
              .from("project_team_members")
              .insert([{
                project_id: projectId,
                user_id: salesAdvisorId,
                role: "sales_advisor",
                responsibilities: "Asesor de ventas original - Conoce todo el expediente del cliente"
              }])
              .select(`
                *,
                profiles:user_id (
                  id,
                  full_name,
                  position,
                  department,
                  avatar_url,
                  skills
                )
              `)
              .single();

            if (!insertError && newMember) {
              teamMembersData.push(newMember);
              toast({
                title: "Asesor de ventas añadido",
                description: "El asesor de ventas original ha sido añadido automáticamente al equipo"
              });
            }
          } catch (insertError) {
            console.log("Error adding sales advisor:", insertError);
          }
        }
      }
      
      const formattedMembers = teamMembersData.map(member => ({
        ...member,
        profile: member.profiles
      }));
      setTeamMembers(formattedMembers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar el equipo del proyecto",
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

      if (status === "completed") {
        updateData.actual_completion_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("design_phases")
        .update(updateData)
        .eq("id", phaseId);

      if (error) throw error;

      // Refresh phases
      fetchDesignPhases();

      toast({
        title: "Fase actualizada",
        description: `El estado de la fase ha sido actualizado a ${status}`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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

      fetchDesignPhases();

      toast({
        title: "Fecha actualizada",
        description: "La fecha estimada de entrega ha sido actualizada"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPhaseProgress = () => {
    const completedPhases = phases.filter(phase => phase.status === "completed").length;
    return (completedPhases / phases.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in_progress": return <Play className="h-5 w-5 text-blue-500" />;
      case "pending": return <Pause className="h-5 w-5 text-gray-400" />;
      default: return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando módulo de diseño...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Proyecto no encontrado</h1>
          <Button onClick={() => navigate("/projects")}>
            Volver a Proyectos
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Palette className="h-8 w-8" />
              Módulo de Diseño
            </h1>
            <p className="text-muted-foreground mt-1">
              Proyecto: {project.name} - Cliente: {project.clients.full_name}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Progreso General</div>
            <div className="flex items-center gap-2">
              <Progress value={getPhaseProgress()} className="w-32" />
              <span className="text-sm font-medium">{Math.round(getPhaseProgress())}%</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="phases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="phases">Fases del Diseño</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          </TabsList>

          <TabsContent value="phases" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {phases.map((phase) => {
                const phaseConfig = designPhases.find(p => p.name === phase.phase_name);
                return (
                  <Card key={phase.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getStatusIcon(phase.status)}
                          {phaseConfig?.label}
                        </CardTitle>
                        <Badge 
                          variant={phase.status === "completed" ? "default" : "secondary"}
                          className={phase.status === "completed" ? "bg-green-100 text-green-800" : ""}
                        >
                          {phase.status === "completed" ? "Completado" : 
                           phase.status === "in_progress" ? "En Progreso" : "Pendiente"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Fecha Estimada de Entrega</Label>
                        <Input
                          type="date"
                          value={phase.estimated_delivery_date ? format(new Date(phase.estimated_delivery_date), "yyyy-MM-dd") : ""}
                          onChange={(e) => e.target.value && updatePhaseDate(phase.id, e.target.value)}
                        />
                      </div>

                      {phase.status === "in_progress" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Días transcurridos: {phase.days_elapsed}
                        </div>
                      )}

                      {phase.actual_completion_date && (
                        <div className="text-sm text-green-600">
                          Completado el: {format(new Date(phase.actual_completion_date), "dd/MM/yyyy", { locale: es })}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Notas</Label>
                        <Textarea
                          value={phase.notes || ""}
                          onChange={(e) => {
                            // Update notes locally for immediate feedback
                            setPhases(prev => prev.map(p => 
                              p.id === phase.id ? { ...p, notes: e.target.value } : p
                            ));
                          }}
                          placeholder="Notas sobre esta fase..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        {phase.status === "pending" && (
                          <Button 
                            onClick={() => updatePhaseStatus(phase.id, "in_progress")}
                            size="sm"
                            className="flex-1"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        {phase.status === "in_progress" && (
                          <Button 
                            onClick={() => updatePhaseStatus(phase.id, "completed")}
                            size="sm"
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Completar
                          </Button>
                        )}
                        {phase.status === "completed" && (
                          <Button 
                            onClick={() => updatePhaseStatus(phase.id, "in_progress")}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="team">
            <TeamMemberSelector 
              projectId={projectId!}
              teamMembers={teamMembers}
              onTeamUpdate={setTeamMembers}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <DesignCalendar 
              projectId={projectId!}
              teamMembers={teamMembers.map(member => ({
                id: member.profile.id,
                full_name: member.profile.full_name,
                avatar_url: member.profile.avatar_url
              }))}
            />
          </TabsContent>

          <TabsContent value="budget">
            <ProjectBudgetManager projectId={projectId!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}