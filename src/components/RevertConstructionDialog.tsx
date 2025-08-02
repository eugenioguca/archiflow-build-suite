import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Trash2 } from "lucide-react";

interface RevertConstructionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onRevertSuccess: () => void;
}

export function RevertConstructionDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onRevertSuccess
}: RevertConstructionDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const dataToDelete = [
    'Fases de construcción',
    'Presupuestos de construcción',
    'Gastos de construcción',
    'Materiales asignados',
    'Equipos de construcción',
    'Cronogramas de construcción',
    'Entregas programadas',
    'Alertas de presupuesto'
  ];

  const handleRevert = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Debe proporcionar un motivo para la reversión",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call the revert function
      const { error } = await supabase.rpc('revert_project_from_construction', {
        project_id_param: projectId,
        revert_reason: reason.trim()
      });

      if (error) throw error;

      toast({
        title: "Proyecto Revertido",
        description: "El proyecto ha sido revertido exitosamente del módulo de construcción",
      });

      onRevertSuccess();
      onOpenChange(false);
      setReason('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo revertir el proyecto: " + (error.message || 'Error desconocido'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Revertir de Construcción
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div>
              ¿Está seguro de que desea revertir el proyecto <strong>"{projectName}"</strong> del módulo de construcción?
            </div>
            
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive">Datos que se eliminarán:</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {dataToDelete.map((item, index) => (
                  <Badge key={index} variant="outline" className="text-xs justify-start">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revert-reason">Motivo de la reversión *</Label>
              <Textarea
                id="revert-reason"
                placeholder="Explique por qué se está revirtiendo este proyecto..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRevert}
            disabled={loading || !reason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? "Revirtiendo..." : "Revertir Proyecto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}