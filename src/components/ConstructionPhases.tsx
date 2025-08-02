import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings, Users, Calendar, DollarSign, Plus, Play, Pause, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ConstructionPhase {
  id: string;
  phase_name: string;
  phase_type: string;
  phase_order: number;
  status: string;
  progress_percentage: number;
  estimated_start_date: string;
  actual_start_date?: string;
  estimated_end_date: string;
  actual_end_date?: string;
  estimated_budget: number;
  actual_cost: number;
  required_team_size: number;
  description?: string;
  special_requirements?: string;
}

interface ConstructionPhasesProps {
  constructionProjectId: string;
}

export function ConstructionPhases({ constructionProjectId }: ConstructionPhasesProps) {
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("construction_phases")
        .select("*")
        .eq("construction_project_id", constructionProjectId)
        .order("phase_order", { ascending: true });

      if (error) throw error;
      setPhases(data || []);
    } catch (error) {
      console.error("Error fetching construction phases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (constructionProjectId) {
      fetchPhases();
    }
  }, [constructionProjectId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "paused": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Completado";
      case "in_progress": return "En Progreso";
      case "paused": return "Pausado";
      case "cancelled": return "Cancelado";
      default: return "Por Iniciar";
    }
  };

  const getPhaseTypeText = (type: string) => {
    switch (type) {
      case "preliminares": return "Preliminares";
      case "cimentacion": return "Cimentación";
      case "estructura": return "Estructura";
      case "albanileria": return "Albañilería";
      case "instalaciones": return "Instalaciones";
      case "acabados": return "Acabados";
      case "exteriores": return "Exteriores";
      case "limpieza": return "Limpieza";
      default: return type;
    }
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
          <h2 className="text-2xl font-bold">Fases de Construcción</h2>
          <p className="text-muted-foreground">Gestión y seguimiento de fases del proyecto</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Fase
        </Button>
      </div>

      {/* Phases Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{phases.length}</div>
            <p className="text-xs text-muted-foreground">Total de fases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {phases.filter(p => p.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {phases.filter(p => p.status === "in_progress").length}
            </div>
            <p className="text-xs text-muted-foreground">En progreso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {Math.round(phases.reduce((acc, p) => acc + p.progress_percentage, 0) / phases.length) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Promedio completado</p>
          </CardContent>
        </Card>
      </div>

      {/* Phases List */}
      <div className="space-y-4">
        {phases.map((phase) => (
          <Card key={phase.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{phase.phase_name}</CardTitle>
                    <Badge variant="outline">{getPhaseTypeText(phase.phase_type)}</Badge>
                    <Badge className={getStatusColor(phase.status)}>
                      {getStatusText(phase.status)}
                    </Badge>
                  </div>
                  {phase.description && (
                    <CardDescription>{phase.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  {phase.status === "not_started" && (
                    <Button variant="outline" size="sm">
                      <Play className="h-3 w-3 mr-1" />
                      Iniciar
                    </Button>
                  )}
                  {phase.status === "in_progress" && (
                    <Button variant="outline" size="sm">
                      <Pause className="h-3 w-3 mr-1" />
                      Pausar
                    </Button>
                  )}
                  {phase.status === "completed" && (
                    <Button variant="outline" size="sm" disabled>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completado
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso</span>
                  <span className="font-medium">{phase.progress_percentage}%</span>
                </div>
                <Progress value={phase.progress_percentage} className="h-2" />
              </div>

              {/* Phase Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Inicio Estimado
                  </div>
                  <p className="text-sm font-medium">
                    {format(new Date(phase.estimated_start_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Fin Estimado
                  </div>
                  <p className="text-sm font-medium">
                    {format(new Date(phase.estimated_end_date), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Presupuesto
                  </div>
                  <p className="text-sm font-medium">
                    ${phase.estimated_budget.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Equipo Requerido
                  </div>
                  <p className="text-sm font-medium">
                    {phase.required_team_size} personas
                  </p>
                </div>
              </div>

              {/* Actual Dates if available */}
              {(phase.actual_start_date || phase.actual_end_date) && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  {phase.actual_start_date && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Inicio Real</p>
                      <p className="text-sm font-medium">
                        {format(new Date(phase.actual_start_date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                  {phase.actual_end_date && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fin Real</p>
                      <p className="text-sm font-medium">
                        {format(new Date(phase.actual_end_date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cost Comparison */}
              {phase.actual_cost > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Costo Real vs Estimado</span>
                    <span className={phase.actual_cost > phase.estimated_budget ? "text-red-600" : "text-green-600"}>
                      ${phase.actual_cost.toLocaleString()} / ${phase.estimated_budget.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={(phase.actual_cost / phase.estimated_budget) * 100} 
                    className="h-2"
                  />
                </div>
              )}

              {/* Special Requirements */}
              {phase.special_requirements && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Requerimientos Especiales</p>
                  <p className="text-sm">{phase.special_requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {phases.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay fases configuradas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Define las fases de construcción para organizar mejor el proyecto.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Fase
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}