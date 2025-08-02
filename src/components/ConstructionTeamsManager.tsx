import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, Plus, Search, UserPlus, Award, Clock, Star, Edit, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConstructionTeam {
  id: string;
  team_name: string;
  team_code: string;
  team_type: string;
  specialty: string;
  team_leader_id: string | null;
  members: any[];
  status: string;
  current_phase_id: string | null;
  current_location: string | null;
  performance_rating: number;
  hourly_rate: number;
  daily_rate: number;
  start_date: string;
  end_date: string | null;
  work_schedule: any;
  contact_information: any;
  certifications: any[];
  safety_record: any;
  productivity_metrics: any;
  equipment_assigned: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ConstructionTeamsManagerProps {
  projectId: string;
}

export function ConstructionTeamsManager({ projectId }: ConstructionTeamsManagerProps) {
  const [teams, setTeams] = useState<ConstructionTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ConstructionTeam | null>(null);
  const [formData, setFormData] = useState({
    team_name: "",
    team_code: "",
    team_type: "",
    specialty: "",
    hourly_rate: 0,
    daily_rate: 0,
    current_location: "",
    notes: "",
  });

  useEffect(() => {
    fetchTeams();
  }, [projectId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("construction_teams")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching teams:", error);
        toast.error("Error al cargar los equipos");
        return;
      }

      setTeams((data || []) as any);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar los equipos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTeam) {
        // Update existing team
        const { error } = await supabase
          .from("construction_teams")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTeam.id);

        if (error) throw error;
        toast.success("Equipo actualizado exitosamente");
      } else {
        // Create new team
        const { error } = await supabase
          .from("construction_teams")
          .insert({
            ...formData,
            project_id: projectId,
            members: [],
            status: "active",
            performance_rating: 5.0,
            start_date: new Date().toISOString().split('T')[0],
            work_schedule: {},
            contact_information: {},
            certifications: [],
            safety_record: {},
            productivity_metrics: {},
            equipment_assigned: [],
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
        toast.success("Equipo creado exitosamente");
      }

      setIsDialogOpen(false);
      setEditingTeam(null);
      setFormData({
        team_name: "",
        team_code: "",
        team_type: "",
        specialty: "",
        hourly_rate: 0,
        daily_rate: 0,
        current_location: "",
        notes: "",
      });
      fetchTeams();
    } catch (error) {
      console.error("Error saving team:", error);
      toast.error("Error al guardar el equipo");
    }
  };

  const handleEdit = (team: ConstructionTeam) => {
    setEditingTeam(team);
    setFormData({
      team_name: team.team_name,
      team_code: team.team_code || "",
      team_type: team.team_type,
      specialty: team.specialty,
      hourly_rate: team.hourly_rate || 0,
      daily_rate: team.daily_rate || 0,
      current_location: team.current_location || "",
      notes: team.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este equipo?")) return;

    try {
      const { error } = await supabase
        .from("construction_teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;
      
      toast.success("Equipo eliminado exitosamente");
      fetchTeams();
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Error al eliminar el equipo");
    }
  };

  const filteredTeams = teams.filter(team =>
    team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.team_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: teams.length,
    active: teams.filter(t => t.status === 'active').length,
    members: teams.reduce((acc, team) => acc + (team.members?.length || 0), 0),
    specialties: new Set(teams.map(t => t.specialty)).size,
    avgRating: teams.length > 0 ? teams.reduce((acc, team) => acc + team.performance_rating, 0) / teams.length : 0,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando equipos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Equipos Totales</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.members}</div>
            <div className="text-sm text-muted-foreground">Miembros</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.specialties}</div>
            <div className="text-sm text-muted-foreground">Especialidades</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgRating.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Rating Promedio</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Equipos de Trabajo
              </CardTitle>
              <CardDescription>
                Equipos especializados, asignaciones y seguimiento de rendimiento
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingTeam(null);
                    setFormData({
                      team_name: "",
                      team_code: "",
                      team_type: "",
                      specialty: "",
                      hourly_rate: 0,
                      daily_rate: 0,
                      current_location: "",
                      notes: "",
                    });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Equipo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTeam ? "Editar Equipo" : "Nuevo Equipo"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTeam ? "Modifica los datos del equipo" : "Crea un nuevo equipo de trabajo"}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                        <Label htmlFor="team_code">Código</Label>
                        <Input
                          id="team_code"
                          value={formData.team_code}
                          onChange={(e) => setFormData({ ...formData, team_code: e.target.value })}
                          placeholder="EQ001"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="team_type">Tipo de Equipo</Label>
                        <Select value={formData.team_type} onValueChange={(value) => setFormData({ ...formData, team_type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="construccion">Construcción</SelectItem>
                            <SelectItem value="acabados">Acabados</SelectItem>
                            <SelectItem value="instalaciones">Instalaciones</SelectItem>
                            <SelectItem value="especializado">Especializado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="specialty">Especialidad</Label>
                        <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar especialidad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="albanileria">Albañilería</SelectItem>
                            <SelectItem value="electricidad">Electricidad</SelectItem>
                            <SelectItem value="plomeria">Plomería</SelectItem>
                            <SelectItem value="carpinteria">Carpintería</SelectItem>
                            <SelectItem value="pintura">Pintura</SelectItem>
                            <SelectItem value="soldadura">Soldadura</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hourly_rate">Tarifa por Hora</Label>
                        <Input
                          id="hourly_rate"
                          type="number"
                          value={formData.hourly_rate}
                          onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="daily_rate">Tarifa por Día</Label>
                        <Input
                          id="daily_rate"
                          type="number"
                          value={formData.daily_rate}
                          onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="current_location">Ubicación Actual</Label>
                      <Input
                        id="current_location"
                        value={formData.current_location}
                        onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                        placeholder="Fase 1 - Cimentación"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas adicionales del equipo..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingTeam ? "Actualizar" : "Crear"} Equipo
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredTeams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {teams.length === 0 ? "No hay equipos registrados" : "No se encontraron equipos"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {teams.length === 0 
                  ? "Crea el primer equipo de trabajo para el proyecto"
                  : "Intenta con otros términos de búsqueda"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{team.team_name}</CardTitle>
                        <CardDescription>{team.team_code}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(team.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">{team.team_type}</Badge>
                      <Badge variant="outline">{team.specialty}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{team.members?.length || 0} miembros</span>
                      </div>
                      
                      {team.current_location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{team.current_location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{team.performance_rating}/5.0</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hora: ${team.hourly_rate}</span>
                      <span className="text-muted-foreground">Día: ${team.daily_rate}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <Badge 
                        variant={team.status === 'active' ? 'default' : 'secondary'}
                      >
                        {team.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}