import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RevertConstructionDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RevertConstructionDialog({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess
}: RevertConstructionDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRevert = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Por favor proporciona una razón para la reversión",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_projects")
        .update({
          status: 'design',
          moved_to_construction_at: null,
          conversion_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Proyecto Revertido",
        description: "El proyecto ha sido revertido al módulo de diseño exitosamente",
      });

      onSuccess();
      onClose();
      setReason('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo revertir el proyecto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Revertir de Construcción
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Proyecto:</strong> {projectName}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Esta acción moverá el proyecto de vuelta al módulo de diseño.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revert-reason">Razón de la reversión *</Label>
            <Textarea
              id="revert-reason"
              placeholder="Explica por qué necesitas revertir este proyecto al módulo de diseño..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevert}
              disabled={loading || !reason.trim()}
              className="flex-1"
            >
              {loading ? (
                "Procesando..."
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Revertir
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}