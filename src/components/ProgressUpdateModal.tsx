import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useActivityUpdate } from "@/hooks/useActivityUpdate";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProgressUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: {
    id: string;
    activity_name: string;
    progress_percentage: number;
    cost_budget?: number;
    cost_actual?: number;
    actual_start_date?: string | null;
    actual_end_date?: string | null;
    notes?: string | null;
  };
  onUpdate?: () => void;
}

export function ProgressUpdateModal({ 
  open, 
  onOpenChange, 
  activity, 
  onUpdate 
}: ProgressUpdateModalProps) {
  const [progress, setProgress] = useState(activity.progress_percentage);
  const [actualCost, setActualCost] = useState(activity.cost_actual || 0);
  const [notes, setNotes] = useState(activity.notes || '');
  const [actualStartDate, setActualStartDate] = useState<Date | undefined>(
    activity.actual_start_date ? new Date(activity.actual_start_date) : undefined
  );
  const [actualEndDate, setActualEndDate] = useState<Date | undefined>(
    activity.actual_end_date ? new Date(activity.actual_end_date) : undefined
  );
  
  const { updateActivity, updating } = useActivityUpdate();

  const handleSave = async () => {
    const updates = {
      progress_percentage: progress,
      cost_actual: actualCost,
      notes: notes,
      actual_start_date: actualStartDate?.toISOString().split('T')[0] || null,
      actual_end_date: actualEndDate?.toISOString().split('T')[0] || null,
    };

    // Auto-calculate status based on progress
    let status = activity.progress_percentage === 0 ? 'not_started' : 'in_progress';
    if (progress === 100) {
      status = 'completed';
      if (!actualEndDate) {
        updates.actual_end_date = new Date().toISOString().split('T')[0];
      }
    } else if (progress > 0 && !actualStartDate) {
      updates.actual_start_date = new Date().toISOString().split('T')[0];
    }

    const success = await updateActivity(activity.id, { ...updates, status });
    if (success) {
      onOpenChange(false);
      if (onUpdate) onUpdate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Actualizar Progreso</DialogTitle>
          <DialogDescription>
            {activity.activity_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Progreso: {progress}%</Label>
            <Slider
              value={[progress]}
              onValueChange={(value) => setProgress(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Inicio Real</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !actualStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {actualStartDate ? (
                      format(actualStartDate, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={actualStartDate}
                    onSelect={setActualStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Fin Real</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !actualEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {actualEndDate ? (
                      format(actualEndDate, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={actualEndDate}
                    onSelect={setActualEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Costo Real</Label>
            <Input
              type="number"
              value={actualCost}
              onChange={(e) => setActualCost(Number(e.target.value))}
              placeholder="0.00"
            />
            {activity.cost_budget && (
              <p className="text-sm text-muted-foreground">
                Presupuestado: ${activity.cost_budget.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios sobre el progreso..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updating}
          >
            {updating ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}