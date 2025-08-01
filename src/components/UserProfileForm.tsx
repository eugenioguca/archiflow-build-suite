import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  position?: string;
  department?: string;
  skills?: string[];
  availability_status?: string;
  phone?: string;
  email?: string;
}

interface UserProfileFormProps {
  profile?: UserProfile;
  onSave?: (profile: UserProfile) => void;
  isEditing?: boolean;
}

export function UserProfileForm({ profile, onSave, isEditing = false }: UserProfileFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    position: profile?.position || "",
    department: profile?.department || "",
    skills: profile?.skills || [],
    availability_status: profile?.availability_status || "available",
    phone: profile?.phone || "",
    email: profile?.email || ""
  });
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);

  const departments = [
    "Ventas",
    "Diseño",
    "Construcción",
    "Administración",
    "Finanzas",
    "Recursos Humanos",
    "Marketing"
  ];

  const availabilityStatuses = [
    { value: "available", label: "Disponible" },
    { value: "busy", label: "Ocupado" },
    { value: "vacation", label: "En vacaciones" },
    { value: "sick_leave", label: "Incapacidad" }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const updateData = {
        full_name: formData.full_name,
        position: formData.position,
        department: formData.department,
        skills: formData.skills,
        availability_status: formData.availability_status,
        phone: formData.phone,
        email: formData.email
      };

      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido guardada correctamente"
      });

      if (onSave) {
        onSave(data);
      }
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar Perfil" : "Completar Perfil de Usuario"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Puesto *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                placeholder="ej. Arquitecto Senior"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Select 
                value={formData.department} 
                onValueChange={(value) => handleInputChange("department", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability_status">Estado de Disponibilidad</Label>
              <Select 
                value={formData.availability_status} 
                onValueChange={(value) => handleInputChange("availability_status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availabilityStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Habilidades y Especialidades</Label>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Añadir habilidad"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button type="button" onClick={addSkill} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}