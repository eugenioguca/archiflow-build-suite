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
  profile: any;
  onComplete: () => void;
}

export function UserOnboarding({ user, profile, onComplete }: UserOnboardingProps) {
  const isClient = profile?.role === 'client';
  
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

    // Solo validar puesto y departamento para empleados
    if (!isClient && !formData.position.trim()) {
      toast({
        title: "Error", 
        description: "El puesto es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (!isClient && !formData.department.trim()) {
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
      const updateData: any = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        profile_completed: true
      };

      // Solo actualizar puesto y departamento para empleados
      if (!isClient) {
        updateData.position = formData.position.trim();
        updateData.department = formData.department.trim();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
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
          <CardTitle className="text-2xl">
            {isClient ? '¡Bienvenido cliente!' : '¡Bienvenido a la plataforma!'}
          </CardTitle>
          <CardDescription>
            {isClient 
              ? 'Completa tu información de contacto para mantenerte al día con tus proyectos'
              : 'Completa tu perfil para crear tu tarjeta de contacto que será utilizada para añadirte a los equipos de proyectos'
            }
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

            {!isClient && (
              <>
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
              </>
            )}

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