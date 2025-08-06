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
import { Users, Plus, X, UserPlus } from "lucide-react";

// Internal team member from project_team_members table
interface InternalTeamMember {
  id: string;
  user_id: string;
  role: string;
  responsibilities?: string;
  type: 'internal';
  profile: {
    id: string;
    full_name: string;
    position?: string;
    department?: string;
    avatar_url?: string;
    skills?: string[];
  };
}

// External team member from external_team_members table
interface ExternalTeamMember {
  id: string;
  project_id: string;
  full_name: string;
  position?: string;
  company?: string;
  email?: string;
  phone?: string;
  role: string;
  responsibilities?: string;
  type: 'external';
  is_active: boolean;
}

type TeamMember = InternalTeamMember | ExternalTeamMember;

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

interface ConstructionTeamManagerProps {
  projectId: string;
}

export function ConstructionTeamManager({ projectId }: ConstructionTeamManagerProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [salesAdvisor, setSalesAdvisor] = useState<any>(null);
  const [architect, setArchitect] = useState<any>(null);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [loading, setLoading] = useState(false);
  
  // External member form state
  const [externalForm, setExternalForm] = useState({
    full_name: "",
    position: "",
    company: "",
    email: "",
    phone: "",
    role: "",
    responsibilities: ""
  });

  const roles = [
    { value: "constructor", label: "Constructor/Maestro de Obra" },
    { value: "safety_supervisor", label: "Supervisor de Seguridad" },
    { value: "materials_coordinator", label: "Coordinador de Materiales" },
    { value: "electrician", label: "Electricista" },
    { value: "plumber", label: "Plomero" },
    { value: "mason", label: "Albañil" },
    { value: "foreman", label: "Capataz" },
    { value: "quality_inspector", label: "Inspector de Calidad" },
    { value: "project_coordinator", label: "Coordinador de Proyecto" },
    { value: "site_engineer", label: "Ingeniero de Obra" }
  ];

  useEffect(() => {
    fetchTeamData();
  }, [projectId]);

  useEffect(() => {
    if (internalDialogOpen) {
      fetchEmployees();
    }
  }, [internalDialogOpen]);

  const fetchTeamData = async () => {
    try {
      // Get project basic info (sales advisor, architect)
      const { data: projectData, error: projectError } = await supabase
        .from("client_projects")
        .select(`
          assigned_advisor_id,
          project_manager_id,
          construction_supervisor_id,
          profiles_advisor:assigned_advisor_id (
            id, user_id, full_name, position, department, avatar_url
          ),
          profiles_manager:project_manager_id (
            id, user_id, full_name, position, department, avatar_url
          )
        `)
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;

      setSalesAdvisor(projectData.profiles_advisor);
      setArchitect(projectData.profiles_manager);

      // Get ALL team members from project_team_members including existing ones
      const { data: allTeamData, error: teamError } = await supabase
        .from("project_team_members")
        .select(`
          *,
          profiles:user_id (
            id, user_id, full_name, position, department, avatar_url, skills
          )
        `)
        .eq("project_id", projectId);

      if (teamError) {
        console.error("Error fetching team members:", teamError);
        throw teamError;
      }

      // Get external team members
      const { data: externalData, error: externalError } = await supabase
        .from("external_team_members")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true);

      if (externalError) {
        console.error("Error fetching external members:", externalError);
        throw externalError;
      }

      // Format internal team members - Filter out null profiles
      const internal: InternalTeamMember[] = (allTeamData || [])
        .filter(member => member.profiles) // Only include members with valid profiles
        .map(member => ({
          ...member,
          type: 'internal' as const,
          profile: member.profiles
        }));

      // Format external team members
      const external: ExternalTeamMember[] = (externalData || []).map(member => ({
        ...member,
        type: 'external' as const
      }));

      // Combine all team members
      const allMembers = [...internal, ...external];

      setTeamMembers(allMembers);
      
      console.log("Team members loaded:", {
        internal: internal.length,
        external: external.length,
        total: allMembers.length,
        salesAdvisor: !!projectData.profiles_advisor,
        architect: !!projectData.profiles_manager
      });
    } catch (error: any) {
      console.error("Error loading team data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del equipo: " + error.message,
        variant: "destructive"
      });
    }
  };

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

  const addInternalMember = async () => {
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
      member => member.type === 'internal' && 
      (member as InternalTeamMember).user_id === selectedEmployee && 
      member.role === selectedRole
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
            id, full_name, position, department, avatar_url, skills
          )
        `)
        .single();

      if (error) throw error;

      const newMember: InternalTeamMember = {
        ...data,
        type: 'internal',
        profile: data.profiles
      };

      setTeamMembers(prev => [...prev, newMember]);

      toast({
        title: "Miembro añadido",
        description: `${data.profiles.full_name} ha sido añadido al equipo`
      });

      // Reset form
      setSelectedEmployee("");
      setSelectedRole("");
      setResponsibilities("");
      setInternalDialogOpen(false);
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

  const addExternalMember = async () => {
    if (!externalForm.full_name || !externalForm.role) {
      toast({
        title: "Error",
        description: "Nombre completo y rol son requeridos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user's profile for created_by
      const { data: currentUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from("external_team_members")
        .insert([{
          project_id: projectId,
          created_by: currentUser?.id,
          ...externalForm
        }])
        .select()
        .single();

      if (error) throw error;

      const newMember: ExternalTeamMember = {
        ...data,
        type: 'external'
      };

      setTeamMembers(prev => [...prev, newMember]);

      toast({
        title: "Miembro externo añadido",
        description: `${externalForm.full_name} ha sido añadido al equipo`
      });

      // Reset form
      setExternalForm({
        full_name: "",
        position: "",
        company: "",
        email: "",
        phone: "",
        role: "",
        responsibilities: ""
      });
      setExternalDialogOpen(false);
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

  const removeMember = async (member: TeamMember) => {
    try {
      if (member.type === 'internal') {
        const { error } = await supabase
          .from("project_team_members")
          .delete()
          .eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("external_team_members")
          .update({ is_active: false })
          .eq("id", member.id);
        if (error) throw error;
      }

      setTeamMembers(prev => prev.filter(m => m.id !== member.id));

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

  const renderMemberCard = (member: TeamMember) => (
    <div key={member.id} className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {member.type === 'internal' ? (
            <UserAvatar
              user={{
                full_name: member.profile.full_name,
                avatar_url: member.profile.avatar_url
              }}
              size="md"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <h4 className="font-medium">
              {member.type === 'internal' ? member.profile.full_name : member.full_name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {member.type === 'internal' ? member.profile.position : member.position}
              {member.type === 'external' && member.company && ` - ${member.company}`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => removeMember(member)}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {getRoleLabel(member.role)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {member.type === 'internal' ? 'Interno' : 'Externo'}
        </Badge>
      </div>
      
      {member.responsibilities && (
        <p className="text-sm text-muted-foreground">
          {member.responsibilities}
        </p>
      )}
      
      {member.type === 'internal' && member.profile.skills && member.profile.skills.length > 0 && (
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

      {member.type === 'external' && (member.email || member.phone) && (
        <div className="text-xs text-muted-foreground">
          {member.email && <div>📧 {member.email}</div>}
          {member.phone && <div>📞 {member.phone}</div>}
        </div>
      )}
    </div>
  );

  const renderBaseTeamCard = (person: any, roleLabel: string, isRequired = false) => {
    if (!person) return null;
    
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-primary/5 border-primary/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={{
                full_name: person.full_name,
                avatar_url: person.avatar_url
              }}
              size="md"
            />
            <div>
              <h4 className="font-medium">{person.full_name}</h4>
              <p className="text-sm text-muted-foreground">
                {person.position}
              </p>
            </div>
          </div>
          {isRequired && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Equipo Base
            </Badge>
          )}
        </div>
        
        <Badge variant="default" className="bg-primary text-primary-foreground">
          {roleLabel} ⭐
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Equipo de Construcción
        </h3>
        <div className="flex gap-2">
          <Dialog open={internalDialogOpen} onOpenChange={setInternalDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Usuario Interno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Usuario Interno</DialogTitle>
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
                  <Label>Rol en Construcción</Label>
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
                  <Button variant="outline" onClick={() => setInternalDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addInternalMember} disabled={loading}>
                    {loading ? "Añadiendo..." : "Añadir al Equipo"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={externalDialogOpen} onOpenChange={setExternalDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Persona Externa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Persona Externa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo *</Label>
                    <Input
                      value={externalForm.full_name}
                      onChange={(e) => setExternalForm(prev => ({...prev, full_name: e.target.value}))}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posición</Label>
                    <Input
                      value={externalForm.position}
                      onChange={(e) => setExternalForm(prev => ({...prev, position: e.target.value}))}
                      placeholder="Ej: Maestro Electricista"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input
                      value={externalForm.company}
                      onChange={(e) => setExternalForm(prev => ({...prev, company: e.target.value}))}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol en Construcción *</Label>
                    <Select 
                      value={externalForm.role} 
                      onValueChange={(value) => setExternalForm(prev => ({...prev, role: value}))}
                    >
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={externalForm.email}
                      onChange={(e) => setExternalForm(prev => ({...prev, email: e.target.value}))}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={externalForm.phone}
                      onChange={(e) => setExternalForm(prev => ({...prev, phone: e.target.value}))}
                      placeholder="555-123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Responsabilidades (Opcional)</Label>
                  <Textarea
                    value={externalForm.responsibilities}
                    onChange={(e) => setExternalForm(prev => ({...prev, responsibilities: e.target.value}))}
                    placeholder="Describe las responsabilidades específicas..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setExternalDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addExternalMember} disabled={loading}>
                    {loading ? "Añadiendo..." : "Añadir al Equipo"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Equipo Base */}
      {(salesAdvisor || architect) && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-muted-foreground">Equipo Base del Proyecto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderBaseTeamCard(salesAdvisor, "Asesor de Ventas", true)}
            {renderBaseTeamCard(architect, "Arquitecto", true)}
          </div>
        </div>
      )}

      {/* Equipo de Construcción */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-muted-foreground">
          Equipo de Construcción ({teamMembers.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map(renderMemberCard)}
        </div>
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">No hay miembros del equipo de construcción</p>
          <p className="text-sm">Agrega usuarios internos o personas externas para formar el equipo</p>
        </div>
      )}
    </div>
  );
}