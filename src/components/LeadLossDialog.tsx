import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

interface LeadLossDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onLeadLost: () => void;
}

const LOSS_REASONS = [
  { value: 'budget', label: 'Presupuesto insuficiente' },
  { value: 'timeline', label: 'Tiempos no alineados' },
  { value: 'competition', label: 'Eligió competencia' },
  { value: 'no_response', label: 'Sin respuesta del cliente' },
  { value: 'project_cancelled', label: 'Proyecto cancelado' },
  { value: 'not_interested', label: 'Perdió interés' },
  { value: 'bad_fit', label: 'No es buen fit' },
  { value: 'other', label: 'Otro motivo' }
];

export function LeadLossDialog({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName, 
  onLeadLost 
}: LeadLossDialogProps) {
  const { toast } = useToast();
  const [lossReason, setLossReason] = useState('');
  const [comments, setComments] = useState('');
  const [futureFollowUp, setFutureFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!lossReason) {
      toast({
        title: "Error",
        description: "Debe seleccionar una razón de pérdida",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Actualizar el cliente a lead_perdido
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          // Project-specific fields moved to client_projects table
          notes: `Lead perdido: ${LOSS_REASONS.find(r => r.value === lossReason)?.label}. ${comments}`
        })
        .eq('id', clientId);

      if (updateError) throw updateError;

      // Crear actividad de pérdida
      const { error: activityError } = await supabase
        .from('crm_activities')
        .insert({
          client_id: clientId,
          user_id: user.id,
          title: `Lead perdido: ${LOSS_REASONS.find(r => r.value === lossReason)?.label}`,
          activity_type: 'follow_up',
          description: `Cliente ${clientName} marcado como lead perdido. Razón: ${LOSS_REASONS.find(r => r.value === lossReason)?.label}. ${comments}`,
          scheduled_date: new Date().toISOString(),
          is_completed: true
        });

      if (activityError) throw activityError;

      // Crear recordatorio futuro si se solicitó
      if (futureFollowUp && followUpDate) {
        const { error: reminderError } = await supabase
          .from('crm_reminders')
          .insert({
            client_id: clientId,
            user_id: user.id,
            title: `Seguimiento post-pérdida: ${clientName}`,
            message: `Intentar reactivar el lead de ${clientName}. Razón de pérdida anterior: ${LOSS_REASONS.find(r => r.value === lossReason)?.label}`,
            reminder_date: new Date(followUpDate).toISOString(),
            is_sent: false
          });

        if (reminderError) console.error('Error creating reminder:', reminderError);
      }

      onLeadLost();
      onClose();
      
      toast({
        title: "Lead marcado como perdido",
        description: `${clientName} ha sido marcado como lead perdido`,
      });
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar el lead como perdido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setLossReason('');
    setComments('');
    setFutureFollowUp(false);
    setFollowUpDate('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Marcar Lead como Perdido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Está a punto de marcar a <strong>{clientName}</strong> como lead perdido.
              Esta acción moverá el cliente fuera del pipeline activo.
            </p>
          </div>

          <div>
            <Label htmlFor="loss_reason">Razón de pérdida *</Label>
            <Select value={lossReason} onValueChange={setLossReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la razón de pérdida" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comments">Comentarios adicionales</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Detalles adicionales sobre la pérdida del lead..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="future_followup"
                checked={futureFollowUp}
                onChange={(e) => setFutureFollowUp(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="future_followup" className="text-sm">
                Programar seguimiento futuro
              </Label>
            </div>

            {futureFollowUp && (
              <div>
                <Label htmlFor="followup_date">Fecha de seguimiento</Label>
                <input
                  type="date"
                  id="followup_date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !lossReason}
              variant="destructive"
              className="flex-1"
            >
              {isSubmitting ? "Procesando..." : "Confirmar Pérdida"}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}