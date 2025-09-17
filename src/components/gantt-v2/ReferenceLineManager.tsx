import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Ruler } from 'lucide-react';
import { useReferenceLines, ReferenceLine } from '@/hooks/gantt-v2/useReferenceLines';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';

interface ReferenceLineManagerProps {
  planId?: string;
  startMonth?: string;
  monthsCount?: number;
}

export function ReferenceLineManager({ 
  planId, 
  startMonth, 
  monthsCount = 12 
}: ReferenceLineManagerProps) {
  const { 
    referenceLines, 
    createReferenceLine, 
    updateReferenceLine, 
    deleteReferenceLine 
  } = useReferenceLines(planId);

  const [isOpen, setIsOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ReferenceLine | null>(null);
  const [formData, setFormData] = useState({
    position_month: '',
    position_week: 1,
    label: 'Línea de Referencia',
    color: '#ef4444'
  });

  if (!planId || !startMonth) return null;

  const monthRange = generateMonthRange(startMonth, monthsCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingLine) {
      await updateReferenceLine.mutateAsync({
        id: editingLine.id,
        ...formData
      });
    } else {
      await createReferenceLine.mutateAsync({
        plan_id: planId,
        ...formData
      });
    }
    
    setIsOpen(false);
    setEditingLine(null);
    setFormData({
      position_month: '',
      position_week: 1,
      label: 'Línea de Referencia',
      color: '#ef4444'
    });
  };

  const handleEdit = (line: ReferenceLine) => {
    setEditingLine(line);
    setFormData({
      position_month: line.position_month,
      position_week: line.position_week,
      label: line.label,
      color: line.color
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta línea de referencia?')) {
      await deleteReferenceLine.mutateAsync(id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingLine(null);
      setFormData({
        position_month: '',
        position_week: 1,
        label: 'Línea de Referencia',
        color: '#ef4444'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Add button */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Añadir Línea de Referencia
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              {editingLine ? 'Editar Línea de Referencia' : 'Añadir Línea de Referencia'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="position_month">Mes</Label>
              <Select 
                value={formData.position_month} 
                onValueChange={(value) => setFormData({ ...formData, position_month: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthRange.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_week">Semana</Label>
              <Select 
                value={formData.position_week.toString()} 
                onValueChange={(value) => setFormData({ ...formData, position_week: parseInt(value) })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semana 1</SelectItem>
                  <SelectItem value="2">Semana 2</SelectItem>
                  <SelectItem value="3">Semana 3</SelectItem>
                  <SelectItem value="4">Semana 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Etiqueta</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Línea de Referencia"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#ef4444"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createReferenceLine.isPending || updateReferenceLine.isPending}
              >
                {editingLine ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Existing reference lines */}
      {referenceLines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Líneas de Referencia</h4>
          <div className="space-y-1">
            {referenceLines.map((line) => {
              const month = monthRange.find(m => m.value === line.position_month);
              return (
                <div key={line.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm border"
                      style={{ backgroundColor: line.color }}
                    />
                    <span>{line.label}</span>
                    <span className="text-muted-foreground">
                      ({month?.label} - S{line.position_week})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(line)}
                      className="h-6 w-6 p-0"
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(line.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      disabled={deleteReferenceLine.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
