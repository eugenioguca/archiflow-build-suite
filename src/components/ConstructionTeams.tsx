import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Star, Phone, Mail, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConstructionTeam {
  id: string;
  team_name: string;
  team_lead_id: string | null;
  specialization: string | null;
  team_members: any;
  contact_info: any;
  performance_rating: number | null;
  active: boolean;
  hourly_rate: number | null;
  daily_rate: number | null;
  assigned_phases: string[];
  safety_record: string | null;
  created_at: string;
}

interface ConstructionTeamsProps {
  constructionProjectId: string;
}

export function ConstructionTeams({ constructionProjectId }: ConstructionTeamsProps) {
  const [teams, setTeams] = useState<ConstructionTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    team_name: "",
    specialization: "",
    contact_info: "",
    hourly_rate: "",
    daily_rate: "",
    safety_record: ""
  });

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("construction_teams")
        .select("*")
        .eq("project_id", constructionProjectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error("Error fetching construction teams:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los equipos de construcción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchTeams();
    }
  }, [constructionProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("construction_teams")
        .insert({
          project_id: constructionProjectId,
          team_name: formData.team_name,
          specialization: formData.specialization,
          contact_info: formData.contact_info ? JSON.parse(formData.contact_info) : {},
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
          safety_record: formData.safety_record,
          team_members: [],
          assigned_phases: [],
          active: true,
          performance_rating: 0,
          created_by: user?.id || ""
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Equipo de construcción agregado correctamente",
      });

      setFormData({
        team_name: "",
        specialization: "",
        contact_info: "",
        hourly_rate: "",
        daily_rate: "",
        safety_record: ""
      });
      setIsDialogOpen(false);
      fetchTeams();
    } catch (error) {
      console.error("Error adding construction team:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el equipo de construcción",
        variant: "destructive",
      });
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return "bg-gray-500";
    if (rating >= 4) return "bg-green-500";
    if (rating >= 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Equipos de Construcción</h2>
          <p className="text-muted-foreground">
            Gestiona los equipos de trabajo del proyecto
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Equipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Equipo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="team_name">Nombre del Equipo</Label>
                <Input
                  id="team_name"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="specialization">Especialización</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, specialization: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar especialización" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="albañileria">Albañilería</SelectItem>
                    <SelectItem value="plomeria">Plomería</SelectItem>
                    <SelectItem value="electricidad">Electricidad</SelectItem>
                    <SelectItem value="carpinteria">Carpintería</SelectItem>
                    <SelectItem value="pintura">Pintura</SelectItem>
                    <SelectItem value="jardineria">Jardinería</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hourly_rate">Tarifa por Hora</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="daily_rate">Tarifa por Día</Label>
                <Input
                  id="daily_rate"
                  type="number"
                  step="0.01"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="safety_record">Historial de Seguridad</Label>
                <Textarea
                  id="safety_record"
                  value={formData.safety_record}
                  onChange={(e) => setFormData({ ...formData, safety_record: e.target.value })}
                  placeholder="Describe el historial de seguridad del equipo"
                />
              </div>
              <Button type="submit" className="w-full">
                Agregar Equipo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay equipos registrados</h3>
            <p className="text-muted-foreground text-center">
              Agrega equipos de construcción para gestionar el proyecto.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{team.team_name}</CardTitle>
                    <CardDescription>
                      {team.specialization || "Especialización no especificada"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className={`h-4 w-4 ${getRatingColor(team.performance_rating)}`} />
                    <span className="text-sm">{team.performance_rating || "N/A"}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant={team.active ? "default" : "secondary"}>
                    {team.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                
                {team.hourly_rate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tarifa/hora:</span>
                    <span>${team.hourly_rate}</span>
                  </div>
                )}
                
                {team.daily_rate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tarifa/día:</span>
                    <span>${team.daily_rate}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fases asignadas:</span>
                  <span>{team.assigned_phases.length}</span>
                </div>
                
                {team.safety_record && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Seguridad:</p>
                    <p className="text-sm">{team.safety_record}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}