import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck } from "lucide-react";

interface UserOnboardingProps {
  user: any;
  onComplete: () => void;
}

export function UserOnboarding({ user, onComplete }: UserOnboardingProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    position: "",
    department: "",
    email: user?.email || "",
    phone: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.full_name.trim()) {
      toast({
        title: "Error",
        description: "El nombre completo es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.position.trim()) {
      toast({
        title: "Error", 
        description: "El puesto es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!formData.department.trim()) {
      toast({
        title: "Error",
        description: "El departamento es obligatorio", 
        variant: "destructive"
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Error",
        description: "El teléfono es obligatorio",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          position: formData.position.trim(),
          department: formData.department.trim(),
          phone: formData.phone.trim(),
          profile_completed: true
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "¡Perfil completado!",
        description: "Tu tarjeta de contacto ha sido creada exitosamente"
      });

      onComplete();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "No se pudo completar el perfil. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">¡Bienvenido a la plataforma!</CardTitle>
          <CardDescription>
            Completa tu perfil para crear tu tarjeta de contacto que será utilizada 
            para añadirte a los equipos de proyectos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="Tu nombre completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Puesto *</Label>
              <Input
                id="position"
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                placeholder="Ej: Arquitecto, Ingeniero, Diseñador"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
                placeholder="Ej: Diseño, Construcción, Ventas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Ej: +52 55 1234 5678"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completando perfil...
                </>
              ) : (
                "Completar Perfil"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}