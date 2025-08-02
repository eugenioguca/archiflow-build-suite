import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Edit } from 'lucide-react';

interface BudgetEditDialogProps {
  constructionProjectId: string;
  currentBudget: number;
  currentArea: number;
  estimatedCompletion: string;
  onUpdate: () => void;
}

export function BudgetEditDialog({ 
  constructionProjectId, 
  currentBudget, 
  currentArea, 
  estimatedCompletion,
  onUpdate 
}: BudgetEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    total_budget: currentBudget,
    construction_area: currentArea,
    estimated_completion_date: estimatedCompletion?.split('T')[0] || '',
    reason: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update construction project
      const { error: constructionError } = await supabase
        .from('construction_projects')
        .update({
          total_budget: formData.total_budget,
          construction_area: formData.construction_area,
          estimated_completion_date: formData.estimated_completion_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', constructionProjectId);

      if (constructionError) throw constructionError;

      // Log budget change in notes (table doesn't exist yet)
      console.log('Budget changed:', {
        construction_project_id: constructionProjectId,
        previous_budget: currentBudget,
        new_budget: formData.total_budget,
        change_reason: formData.reason,
        notes: formData.notes
      });

      

      toast({
        title: "Presupuesto actualizado",
        description: "Los cambios han sido guardados exitosamente"
      });

      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el presupuesto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Editar Presupuesto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Actualizar Presupuesto del Proyecto
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_budget">Presupuesto Total</Label>
              <Input
                id="total_budget"
                type="number"
                value={formData.total_budget}
                onChange={(e) => setFormData(prev => ({ ...prev, total_budget: Number(e.target.value) }))}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="construction_area">Área de Construcción (m²)</Label>
              <Input
                id="construction_area"
                type="number"
                value={formData.construction_area}
                onChange={(e) => setFormData(prev => ({ ...prev, construction_area: Number(e.target.value) }))}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_completion_date">Fecha Estimada de Finalización</Label>
            <Input
              id="estimated_completion_date"
              type="date"
              value={formData.estimated_completion_date}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_completion_date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Razón del Cambio *</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una razón" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="material_price_increase">Incremento en precios de materiales</SelectItem>
                <SelectItem value="scope_change">Cambio en alcance del proyecto</SelectItem>
                <SelectItem value="design_modification">Modificación de diseño</SelectItem>
                <SelectItem value="client_request">Solicitud del cliente</SelectItem>
                <SelectItem value="unforeseen_conditions">Condiciones imprevistas</SelectItem>
                <SelectItem value="regulatory_changes">Cambios regulatorios</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Detalles adicionales sobre el cambio..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.reason}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}