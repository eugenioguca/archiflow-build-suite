import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, CheckCircle, UserCheck, AlertTriangle } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  status: string;
  assigned_advisor_id?: string;
}

interface SalesPhaseManagerProps {
  client: Client;
  employees: any[];
  onClientUpdate: () => void;
}

const SALES_PHASES = {
  nuevo_lead: {
    label: "Nuevo Lead",
    color: "bg-yellow-100 text-yellow-700",
    icon: UserCheck,
    nextPhases: ['en_contacto'],
    description: "Lead recién capturado, requiere asignación de asesor"
  },
  en_contacto: {
    label: "En Contacto", 
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
    nextPhases: ['lead_perdido', 'cliente_cerrado'],
    description: "Asesor en contacto activo con el cliente"
  },
  lead_perdido: {
    label: "Lead Perdido",
    color: "bg-red-100 text-red-700", 
    icon: AlertTriangle,
    nextPhases: [],
    description: "Lead que no se pudo convertir"
  },
  cliente_cerrado: {
    label: "Cliente Cerrado",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    nextPhases: [],
    description: "Cliente convertido exitosamente"
  }
};

export function SalesPhaseManager({ client, employees, onClientUpdate }: SalesPhaseManagerProps) {
  const { toast } = useToast();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [targetPhase, setTargetPhase] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');

  const currentPhase = SALES_PHASES[client.status as keyof typeof SALES_PHASES];
  const canTransition = currentPhase?.nextPhases.length > 0;

  const validateTransition = (newPhase: string): string | null => {
    if (newPhase === 'en_contacto' && !client.assigned_advisor_id) {
      return 'Debe asignar un asesor antes de mover a "En Contacto"';
    }
    return null;
  };

  const executeTransition = async () => {
    const validationError = validateTransition(targetPhase);
    if (validationError) {
      toast({
        title: "Error de validación",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsTransitioning(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Actualizar status del cliente
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          status: targetPhase as any,
          last_contact_date: new Date().toISOString().split('T')[0],
          ...(targetPhase === 'cliente_cerrado' && {
            conversion_date: new Date().toISOString().split('T')[0],
            sales_pipeline_stage: 'closed'
          }),
          ...(targetPhase === 'lead_perdido' && {
            conversion_date: new Date().toISOString().split('T')[0],
            sales_pipeline_stage: 'closed'
          })
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      // Crear actividad de transición
      const { error: activityError } = await supabase
        .from('crm_activities')
        .insert({
          client_id: client.id,
          user_id: user.id,
          title: `Transición: ${currentPhase.label} → ${SALES_PHASES[targetPhase as keyof typeof SALES_PHASES].label}`,
          activity_type: 'follow_up',
          description: `Cliente ${client.full_name} movido de ${currentPhase.label} a ${SALES_PHASES[targetPhase as keyof typeof SALES_PHASES].label}. ${transitionNotes}`,
          scheduled_date: new Date().toISOString(),
          is_completed: true
        });

      if (activityError) throw activityError;

      // Si es cliente cerrado, crear proyecto automáticamente en diseño
      if (targetPhase === 'cliente_cerrado') {
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            name: `Proyecto ${client.full_name}`,
            client_id: client.id,
            status: 'planning',
            description: `Proyecto generado automáticamente desde ventas. ${transitionNotes}`,
            start_date: new Date().toISOString().split('T')[0]
          });

        if (projectError) console.error('Error creating project:', projectError);
      }

      onClientUpdate();
      setShowTransitionDialog(false);
      setTargetPhase('');
      setTransitionNotes('');
      
      toast({
        title: "Transición completada",
        description: `Cliente movido a ${SALES_PHASES[targetPhase as keyof typeof SALES_PHASES].label}`,
      });
    } catch (error) {
      console.error('Error in transition:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la transición",
        variant: "destructive",
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  if (!currentPhase) {
    return (
      <Badge variant="secondary">
        Estado desconocido
      </Badge>
    );
  }

  const Icon = currentPhase.icon;

  return (
    <div className="flex items-center gap-3">
      <Badge className={currentPhase.color}>
        <Icon className="h-3 w-3 mr-1" />
        {currentPhase.label}
      </Badge>

      {canTransition && (
        <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <ArrowRight className="h-3 w-3 mr-1" />
              Avanzar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transición de Fase de Ventas</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Estado actual:</p>
                <Badge className={currentPhase.color}>
                  <Icon className="h-3 w-3 mr-1" />
                  {currentPhase.label}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">{currentPhase.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Mover a:</Label>
                <div className="space-y-2 mt-2">
                  {currentPhase.nextPhases.map((phase) => {
                    const phaseConfig = SALES_PHASES[phase as keyof typeof SALES_PHASES];
                    const PhaseIcon = phaseConfig.icon;
                    const validationError = validateTransition(phase);

                    return (
                      <button
                        key={phase}
                        onClick={() => setTargetPhase(phase)}
                        disabled={!!validationError}
                        className={`
                          w-full p-3 border rounded-lg text-left transition-colors
                          ${targetPhase === phase ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                          ${validationError ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          <PhaseIcon className="h-4 w-4" />
                          <span className="font-medium">{phaseConfig.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{phaseConfig.description}</p>
                        {validationError && (
                          <p className="text-xs text-red-600 mt-1">{validationError}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {targetPhase && (
                <div>
                  <Label htmlFor="transition_notes">Notas de transición</Label>
                  <Textarea
                    id="transition_notes"
                    value={transitionNotes}
                    onChange={(e) => setTransitionNotes(e.target.value)}
                    placeholder="Detalles sobre esta transición..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={executeTransition}
                  disabled={!targetPhase || isTransitioning}
                  className="flex-1"
                >
                  {isTransitioning ? "Procesando..." : "Confirmar Transición"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowTransitionDialog(false);
                    setTargetPhase('');
                    setTransitionNotes('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}