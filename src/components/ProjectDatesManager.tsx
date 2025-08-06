import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ProjectDatesManagerProps {
  projectId: string;
  constructionStartDate?: string | null;
  estimatedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  trigger?: React.ReactNode;
  onDatesUpdated?: () => void;
}

export function ProjectDatesManager({
  projectId,
  constructionStartDate,
  estimatedCompletionDate,
  actualCompletionDate,
  trigger,
  onDatesUpdated
}: ProjectDatesManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    construction_start_date: constructionStartDate ? format(new Date(constructionStartDate), "yyyy-MM-dd") : "",
    estimated_completion_date: estimatedCompletionDate ? format(new Date(estimatedCompletionDate), "yyyy-MM-dd") : "",
    actual_completion_date: actualCompletionDate ? format(new Date(actualCompletionDate), "yyyy-MM-dd") : ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.construction_start_date && formData.estimated_completion_date) {
      const startDate = new Date(formData.construction_start_date);
      const estimatedDate = new Date(formData.estimated_completion_date);
      
      if (startDate >= estimatedDate) {
        toast.error("La fecha de inicio debe ser anterior a la fecha estimada de finalización");
        return;
      }
    }
    
    if (formData.actual_completion_date && !formData.construction_start_date) {
      toast.error("No se puede establecer fecha real de finalización sin fecha de inicio");
      return;
    }
    
    if (formData.actual_completion_date && formData.construction_start_date) {
      const startDate = new Date(formData.construction_start_date);
      const actualDate = new Date(formData.actual_completion_date);
      
      if (actualDate <= startDate) {
        toast.error("La fecha real de finalización debe ser posterior a la fecha de inicio");
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const updateData: any = {};
      
      if (formData.construction_start_date) {
        updateData.construction_start_date = formData.construction_start_date;
      }
      
      if (formData.estimated_completion_date) {
        updateData.estimated_completion_date = formData.estimated_completion_date;
      }
      
      if (formData.actual_completion_date) {
        updateData.actual_completion_date = formData.actual_completion_date;
      }
      
      const { error } = await supabase
        .from("client_projects")
        .update(updateData)
        .eq("id", projectId);
      
      if (error) throw error;
      
      toast.success("Fechas del proyecto actualizadas correctamente");
      setOpen(false);
      onDatesUpdated?.();
    } catch (error) {
      console.error("Error updating project dates:", error);
      toast.error("Error al actualizar las fechas del proyecto");
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateString: string | null) => {
    if (!dateString) return "No establecida";
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Configurar fechas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gestionar fechas del proyecto</DialogTitle>
          <DialogDescription>
            Configure las fechas de inicio, estimada de finalización y real de finalización del proyecto de construcción.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Estado actual de fechas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Estado actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Inicio de obra:</span>
                <span className="font-medium">{formatDateForDisplay(constructionStartDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fecha estimada:</span>
                <span className="font-medium">{formatDateForDisplay(estimatedCompletionDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fecha real:</span>
                <span className="font-medium">{formatDateForDisplay(actualCompletionDate)}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha de inicio de obra</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.construction_start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, construction_start_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estimated-date">Fecha estimada de finalización</Label>
              <Input
                id="estimated-date"
                type="date"
                value={formData.estimated_completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_completion_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actual-date">Fecha real de finalización</Label>
              <Input
                id="actual-date"
                type="date"
                value={formData.actual_completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_completion_date: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar fechas"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}