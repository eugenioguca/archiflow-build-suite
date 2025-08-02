import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RevertConstructionDialog } from './RevertConstructionDialog';
import { transitionToConstruction, validateConstructionTransition } from '@/utils/projectTransitions';
import { 
  CheckCircle, 
  ArrowRight, 
  Building, 
  FileText, 
  Clock,
  AlertCircle,
  RotateCcw
} from "lucide-react";

interface DesignPhase {
  id: string;
  project_id: string;
  phase_name: string;
  phase_order: number;
  status: string;
  estimated_delivery_date?: string;
  actual_completion_date?: string;
  notes?: string;
  days_elapsed: number;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');

  const isDesignCompleted = phases.every(phase => 
    phase.phase_name === 'Diseño Completado' ? phase.status === 'completed' : true
  );

  const finalPhase = phases.find(phase => phase.phase_name === 'Diseño Completado');
  const isReadyForCompletion = phases
    .filter(phase => phase.phase_name !== 'Diseño Completado')
    .every(phase => phase.status === 'completed');

  useEffect(() => {
    fetchProjectStatus();
  }, [projectId]);

  const fetchProjectStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('client_projects')
        .select('status, project_name')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectStatus(data.status);
      setProjectName(data.project_name);
    } catch (error) {
      console.error('Error fetching project status:', error);
    }
  };

  const handleRevertSuccess = () => {
    fetchProjectStatus(); // Refresh project status
    window.location.reload(); // Refresh the entire view
  };

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
      // Validate transition first
      const validation = await validateConstructionTransition(projectId);
      
      if (!validation.canTransition) {
        toast({
          title: "No se puede transferir",
          description: `Problemas encontrados: ${validation.reasons.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Use utility function for controlled transition
      await transitionToConstruction({
        projectId,
        fromStatus: projectStatus,
        toStatus: 'construction',
        reason: 'Cliente acepta continuar con construcción'
      });

      toast({
        title: "Proyecto Transferido",
        description: "El proyecto se ha movido al módulo de construcción exitosamente",
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

  const handleBudgetAccepted = async () => {
    setLoading(true);
    try {
      // Use controlled transition with budget_accepted status
      await transitionToConstruction({
        projectId,
        fromStatus: projectStatus,
        toStatus: 'budget_accepted',
        reason: 'Cliente acepta presupuesto y autoriza construcción'
      });

      // Update status to budget_accepted specifically
      const { error } = await supabase
        .from("client_projects")
        .update({
          status: 'budget_accepted',
          moved_to_construction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Presupuesto Aceptado",
        description: "El proyecto se ha movido automáticamente al módulo de construcción",
      });

      // Refresh to reflect changes
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo procesar la aceptación del presupuesto",
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-4 w-4" />
          Estado del Diseño
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progreso</span>
            <span className="text-sm text-muted-foreground">{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-1.5" />
        </div>

        {/* Compact Phase Status */}
        <div className="grid grid-cols-2 gap-2">
          {phases.map(phase => (
            <div key={phase.id} className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                phase.status === 'completed' ? 'bg-green-500' : 
                phase.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
              }`}></div>
              <span className="truncate">{phase.phase_name}</span>
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

        {/* Design Status Options */}
        <div className="space-y-3">
          <div className="text-sm font-medium mb-2">Estado del Diseño</div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleMoveToConstruction}
              disabled={loading}
              className="w-full justify-start h-auto p-3"
              variant="outline"
            >
              <div className="flex items-center gap-3 w-full">
                <Building className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Cliente ya cuenta con un diseño</div>
                  <div className="text-xs text-muted-foreground">Omitir fases de diseño y continuar con construcción</div>
                </div>
              </div>
            </Button>

            <Button 
              onClick={handleBudgetAccepted}
              disabled={loading}
              className="w-full justify-start h-auto p-3"
              variant="outline"
            >
              <div className="flex items-center gap-3 w-full">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Cliente Acepta presupuesto de Obra</div>
                  <div className="text-xs text-muted-foreground">Proyecto pasa automáticamente a construcción</div>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Post-Completion Options */}
        {isDesignCompleted && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-800 font-medium">¡Diseño Completado!</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleMoveToConstruction}
                disabled={loading}
                size="sm"
              >
                <Building className="h-4 w-4 mr-1" />
                Construcción
              </Button>

              <Button 
                onClick={handleCompleteDesignOnly}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-1" />
                Solo Diseño
              </Button>
            </div>
          </div>
        )}

        {/* Revert from Construction Option */}
        {(projectStatus === 'construction' || projectStatus === 'budget_accepted') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
              <Building className="h-4 w-4 text-orange-600" />
              <span className="text-orange-800 font-medium">Proyecto en Construcción</span>
            </div>

            <Button 
              onClick={() => setRevertDialogOpen(true)}
              disabled={loading}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Revertir de Construcción
            </Button>
          </div>
        )}
      </CardContent>
      
      <RevertConstructionDialog
        projectId={projectId}
        projectName={projectName}
        isOpen={revertDialogOpen}
        onClose={() => setRevertDialogOpen(false)}
        onSuccess={handleRevertSuccess}
      />
    </Card>
  );
}