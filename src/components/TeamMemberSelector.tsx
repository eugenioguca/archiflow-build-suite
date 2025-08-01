import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, X } from "lucide-react";

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

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  position?: string;
  department?: string;
  avatar_url?: string;
  skills?: string[];
  availability_status?: string;
}

interface TeamMemberSelectorProps {
  projectId: string;
  teamMembers: TeamMember[];
  onTeamUpdate: (members: TeamMember[]) => void;
}

export function TeamMemberSelector({ projectId, teamMembers, onTeamUpdate }: TeamMemberSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: "sales_advisor", label: "Asesor de Ventas" },
    { value: "architect", label: "Arquitecto" },
    { value: "project_manager", label: "Gerente de Proyecto" },
    { value: "engineer", label: "Ingeniero" },
    { value: "designer", label: "Diseñador" },
    { value: "constructor", label: "Constructor" }
  ];

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "employee"])
        .order("full_name");
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      });
    }
  };

  const addTeamMember = async () => {
    if (!selectedEmployee || !selectedRole) {
      toast({
        title: "Error",
        description: "Selecciona un empleado y un rol",
        variant: "destructive"
      });
      return;
    }

    // Check if member already exists with this role
    const existingMember = teamMembers.find(
      member => member.user_id === selectedEmployee && member.role === selectedRole
    );

    if (existingMember) {
      toast({
        title: "Error",
        description: "Este empleado ya tiene asignado este rol en el proyecto",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);
      if (!selectedEmployeeData) throw new Error("Empleado no encontrado");

      const { data, error } = await supabase
        .from("project_team_members")
        .insert([{
          project_id: projectId,
          user_id: selectedEmployee,
          role: selectedRole,
          responsibilities: responsibilities || null
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

      if (error) throw error;

      const newMember: TeamMember = {
        id: data.id,
        user_id: data.user_id,
        role: data.role,
        responsibilities: data.responsibilities,
        profile: data.profiles
      };

      onTeamUpdate([...teamMembers, newMember]);

      toast({
        title: "Miembro añadido",
        description: `${selectedEmployeeData.full_name} ha sido añadido al equipo`
      });

      // Reset form
      setSelectedEmployee("");
      setSelectedRole("");
      setResponsibilities("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTeamMember = async (memberId: string, memberRole: string) => {
    // Prevent removal of sales advisor
    if (memberRole === "sales_advisor") {
      toast({
        title: "No se puede eliminar",
        description: "El asesor de ventas original no puede ser removido del equipo ya que conoce todo el expediente del cliente",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("project_team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      const updatedMembers = teamMembers.filter(member => member.id !== memberId);
      onTeamUpdate(updatedMembers);

      toast({
        title: "Miembro removido",
        description: "El miembro ha sido removido del equipo"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getRoleLabel = (role: string) => {
    return roles.find(r => r.value === role)?.label || role;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo del Proyecto
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Miembro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Miembro al Equipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empleado</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            user={{ 
                              full_name: employee.full_name, 
                              avatar_url: employee.avatar_url 
                            }}
                            size="sm"
                            showTooltip={false}
                          />
                          <div>
                            <div className="font-medium">{employee.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee.position} - {employee.department}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rol en el Proyecto</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsabilidades (Opcional)</Label>
                <Textarea
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="Describe las responsabilidades específicas..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addTeamMember} disabled={loading}>
                  {loading ? "Añadiendo..." : "Añadir al Equipo"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <div key={member.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  user={{
                    full_name: member.profile.full_name,
                    avatar_url: member.profile.avatar_url
                  }}
                  size="md"
                />
                <div>
                  <h4 className="font-medium">{member.profile.full_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {member.profile.position}
                  </p>
                </div>
              </div>
              {member.role !== "sales_advisor" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeTeamMember(member.id, member.role)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  Requerido
                </Badge>
              )}
            </div>
            
            <Badge 
              variant={member.role === "sales_advisor" ? "default" : "secondary"}
              className={member.role === "sales_advisor" ? "bg-primary text-primary-foreground" : ""}
            >
              {getRoleLabel(member.role)}
              {member.role === "sales_advisor" && " ⭐"}
            </Badge>
            
            {member.responsibilities && (
              <p className="text-sm text-muted-foreground">
                {member.responsibilities}
              </p>
            )}
            
            {member.profile.skills && member.profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {member.profile.skills.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {member.profile.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{member.profile.skills.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay miembros asignados al proyecto</p>
          <p className="text-sm">Haz clic en "Añadir Miembro" para comenzar</p>
        </div>
      )}
    </div>
  );
}