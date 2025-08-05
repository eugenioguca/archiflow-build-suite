import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Plus } from "lucide-react";

interface ClientProject {
  id: string;
  client_id: string;
  project_name: string;
  client?: {
    full_name: string;
  };
}

interface Project {
  id: string;
  client_id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  role?: string;
}

interface SalesAppointmentSchedulerProps {
  clientProject: ClientProject;
  triggerButton?: React.ReactNode;
}

export function SalesAppointmentScheduler({ clientProject, triggerButton }: SalesAppointmentSchedulerProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    appointment_date: new Date().toISOString().slice(0, 16),
    attendees: [] as string[]
  });

  useEffect(() => {
    if (dialogOpen) {
      fetchProjectData();
    }
  }, [dialogOpen, clientProject.client_id]);

  useEffect(() => {
    if (project) {
      fetchTeamMembers();
    }
  }, [project]);

  const fetchProjectData = async () => {
    try {
      // Find the corresponding project from the projects table using client_id
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientProject.client_id)
        .single();

      if (error) {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description: "No se encontró el proyecto asociado. El cliente debe tener un proyecto en la fase de diseño.",
          variant: "destructive"
        });
        return;
      }

      setProject(data);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al buscar el proyecto asociado",
        variant: "destructive"
      });
    }
  };

  const fetchTeamMembers = async () => {
    if (!project?.id) return;
    
    try {
      // Try to fetch team members from profiles with design/architect department
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department_enum")
        .in("department_enum", ["diseño", "construcción"])
        .limit(10);

      if (error) throw error;

      const members = data?.map(profile => ({
        id: profile.id,
        full_name: profile.full_name || '',
        role: profile.department_enum || ''
      })) || [];

      setTeamMembers(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      // Continue without team members if there's an error
      setTeamMembers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) {
      toast({
        title: "Error",
        description: "No se encontró el proyecto asociado",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      // Create the appointment with the correct project_id from projects table
      const appointmentData = {
        project_id: project.id, // Use the project.id from projects table, not client_project.id
        client_id: clientProject.client_id,
        title: formData.title,
        description: formData.description,
        appointment_date: formData.appointment_date,
        attendees: formData.attendees,
        created_by: profile.id,
        status: "scheduled",
        visible_to_sales: true // Critical: Make it visible to sales
      };

      const { error } = await supabase
        .from("design_appointments")
        .insert([appointmentData]);

      if (error) throw error;

      toast({
        title: "Cita programada",
        description: "La cita ha sido programada exitosamente y aparecerá en todos los módulos relevantes"
      });

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: error.message || "Error al programar la cita",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      appointment_date: new Date().toISOString().slice(0, 16),
      attendees: []
    });
    setProject(null);
    setTeamMembers([]);
  };

  const toggleAttendee = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(memberId)
        ? prev.attendees.filter(id => id !== memberId)
        : [...prev.attendees, memberId]
    }));
  };

  const defaultTrigger = (
    <Button size="sm" variant="outline">
      <Calendar className="h-4 w-4 mr-2" />
      Programar Cita
    </Button>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {triggerButton || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Programar Cita de Revisión</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cliente: {clientProject.client?.full_name || 'N/A'} | Proyecto: {clientProject.project_name}
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título de la Cita *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="ej. Revisión de avances del diseño"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_date">Fecha y Hora *</Label>
              <Input
                id="appointment_date"
                type="datetime-local"
                value={formData.appointment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Agenda y objetivos de la cita de revisión..."
              rows={3}
            />
          </div>

          {teamMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Asistentes del Equipo</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      formData.attendees.includes(member.id)
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                    onClick={() => toggleAttendee(member.id)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.attendees.includes(member.id)}
                      onChange={() => {}} // Handled by onClick
                      className="rounded"
                    />
                    <div className="text-sm">
                      <div>{member.full_name}</div>
                      {member.role && (
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Información sobre la Cita
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• La cita aparecerá en el calendario del módulo de Diseño</li>
              <li>• Será visible para el equipo de ventas en el calendario</li>
              <li>• El cliente podrá verla en su portal</li>
              <li>• Se notificará automáticamente al asesor asignado</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Programando..." : "Programar Cita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}