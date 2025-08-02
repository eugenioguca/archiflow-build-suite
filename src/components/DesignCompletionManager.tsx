import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  ArrowRight, 
  Building, 
  FileText, 
  Clock,
  AlertCircle 
} from "lucide-react";

interface DesignPhase {
  id: string;
  phase_name: string;
  status: string;
  phase_order: number;
  estimated_delivery_date?: string;
  actual_completion_date?: string;
  days_elapsed: number;
  notes?: string;
}

interface DesignCompletionManagerProps {
  projectId: string;
  phases: DesignPhase[];
  onPhaseUpdate: (phases: DesignPhase[]) => void;
}

export function DesignCompletionManager({ 
  projectId, 
  phases, 
  onPhaseUpdate 
}: DesignCompletionManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const isDesignCompleted = phases.every(phase => 
    phase.phase_name === 'Diseño Completado' ? phase.status === 'completed' : true
  );

  const finalPhase = phases.find(phase => phase.phase_name === 'Diseño Completado');
  const isReadyForCompletion = phases
    .filter(phase => phase.phase_name !== 'Diseño Completado')
    .every(phase => phase.status === 'completed');

  const handleCompleteDesign = async () => {
    if (!finalPhase) return;

    setLoading(true);
    try {
      // Mark final phase as completed
      const { error: phaseError } = await supabase
        .from("design_phases")
        .update({
          status: 'completed',
          actual_completion_date: new Date().toISOString().split('T')[0],
          notes: completionNotes
        })
        .eq("id", finalPhase.id);

      if (phaseError) throw phaseError;

      // Update project status to design completed
      const { error: projectError } = await supabase
        .from("client_projects")
        .update({
          status: 'design_completed',
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (projectError) throw projectError;

      // Update local state
      const updatedPhases = phases.map(phase =>
        phase.id === finalPhase.id
          ? {
              ...phase,
              status: 'completed',
              actual_completion_date: new Date().toISOString().split('T')[0],
              notes: completionNotes
            }
          : phase
      );

      onPhaseUpdate(updatedPhases);
      setDialogOpen(false);
      setCompletionNotes('');

      toast({
        title: "Diseño Completado",
        description: "El diseño ha sido marcado como completado. Ahora puedes decidir el siguiente paso.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo completar el diseño",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToConstruction = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_projects")
        .update({
          status: 'construction',
          moved_to_construction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Proyecto Transferido",
        description: "El proyecto se ha movido al módulo de construcción",
      });

      // Refresh page or redirect
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo transferir el proyecto a construcción",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDesignOnly = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_projects")
        .update({
          status: 'design_only_completed',
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Proyecto Finalizado",
        description: "El proyecto se ha marcado como completado solo con diseño",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo finalizar el proyecto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    const completedPhases = phases.filter(phase => phase.status === 'completed').length;
    return Math.round((completedPhases / phases.length) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Estado del Diseño
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Phase Status Summary */}
        <div className="grid grid-cols-2 gap-4">
          {phases.map(phase => (
            <div key={phase.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                phase.status === 'completed' ? 'bg-green-500' : 
                phase.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm">{phase.phase_name}</span>
            </div>
          ))}
        </div>

        {/* Completion Actions */}
        {!isDesignCompleted && (
          <div className="space-y-4">
            {isReadyForCompletion ? (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completar Diseño
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Completar Diseño</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="completion-notes">Notas de Finalización</Label>
                      <Textarea
                        id="completion-notes"
                        placeholder="Describe los detalles finales del diseño, entregas realizadas, etc."
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <Button 
                      onClick={handleCompleteDesign} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Procesando..." : "Confirmar Finalización"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <div className="text-sm text-amber-800">
                  Completa todas las fases anteriores para finalizar el diseño
                </div>
              </div>
            )}
          </div>
        )}

        {/* Post-Completion Options */}
        {isDesignCompleted && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-sm text-green-800 font-medium">
                ¡Diseño Completado! ¿Cuál es el siguiente paso?
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleMoveToConstruction}
                disabled={loading}
                className="flex items-center gap-2"
                size="lg"
              >
                <Building className="h-4 w-4" />
                Continuar con Construcción
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button 
                onClick={handleCompleteDesignOnly}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
                size="lg"
              >
                <FileText className="h-4 w-4" />
                Solo Diseño
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center mt-4">
              <p><strong>Continuar con Construcción:</strong> Transferir proyecto al módulo de construcción con presupuesto</p>
              <p><strong>Solo Diseño:</strong> Finalizar el proyecto únicamente con el diseño entregado</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}