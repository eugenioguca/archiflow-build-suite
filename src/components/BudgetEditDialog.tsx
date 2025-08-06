import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

interface BudgetItem {
  id: string;
  item_code?: string;
  item_name: string;
  item_description?: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_of_measure: string;
  status?: string;
}

interface BudgetEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: BudgetItem | null;
  onSave: (updatedItem: BudgetItem, changeReason: string, changeComments?: string) => Promise<void>;
  isSaving?: boolean;
}

export const BudgetEditDialog: React.FC<BudgetEditDialogProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  isSaving = false
}) => {
  const [editedItem, setEditedItem] = useState<BudgetItem | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [changeComments, setChangeComments] = useState('');
  const [hasSignificantChanges, setHasSignificantChanges] = useState(false);

  React.useEffect(() => {
    if (item) {
      setEditedItem({ ...item });
      setChangeReason('');
      setChangeComments('');
      setHasSignificantChanges(false);
    }
  }, [item]);

  const handleInputChange = (field: keyof BudgetItem, value: any) => {
    if (!editedItem || !item) return;

    const newItem = { ...editedItem, [field]: value };
    
    // Recalculate total if quantity or unit_price changed
    if (field === 'quantity' || field === 'unit_price') {
      newItem.total_price = newItem.quantity * newItem.unit_price;
    }

    // Check for significant changes (>10% price change or quantity change)
    const originalTotal = item.total_price;
    const newTotal = newItem.total_price;
    const percentChange = Math.abs((newTotal - originalTotal) / originalTotal) * 100;
    
    const significantChange = 
      percentChange > 10 || 
      newItem.quantity !== item.quantity ||
      newItem.status !== item.status;

    setHasSignificantChanges(significantChange);
    setEditedItem(newItem);
  };

  const handleSave = async () => {
    if (!editedItem || !changeReason.trim()) return;
    
    try {
      await onSave(editedItem, changeReason, changeComments || undefined);
      onClose();
    } catch (error) {
      console.error('Error saving budget item:', error);
    }
  };

  if (!editedItem) return null;

  const isFormValid = changeReason.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Partida de Presupuesto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasSignificantChanges && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Cambio significativo detectado. Se requiere justificación.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_code">Código</Label>
              <Input
                id="item_code"
                value={editedItem.item_code || ''}
                onChange={(e) => handleInputChange('item_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={editedItem.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Estructural">Estructural</SelectItem>
                  <SelectItem value="Acabados">Acabados</SelectItem>
                  <SelectItem value="Instalaciones">Instalaciones</SelectItem>
                  <SelectItem value="Equipamiento">Equipamiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="item_name">Nombre de Partida</Label>
            <Input
              id="item_name"
              value={editedItem.item_name}
              onChange={(e) => handleInputChange('item_name', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="item_description">Descripción</Label>
            <Textarea
              id="item_description"
              value={editedItem.item_description || ''}
              onChange={(e) => handleInputChange('item_description', e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={editedItem.quantity}
                onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="unit_of_measure">Unidad</Label>
              <Select
                value={editedItem.unit_of_measure}
                onValueChange={(value) => handleInputChange('unit_of_measure', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PZA">PZA</SelectItem>
                  <SelectItem value="M2">M²</SelectItem>
                  <SelectItem value="M3">M³</SelectItem>
                  <SelectItem value="ML">ML</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="TON">TON</SelectItem>
                  <SelectItem value="LT">LT</SelectItem>
                  <SelectItem value="GLB">GLB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit_price">Precio Unitario</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={editedItem.unit_price}
                onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="total_price">Total</Label>
            <Input
              id="total_price"
              type="number"
              value={editedItem.total_price.toFixed(2)}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              value={editedItem.status || 'pending'}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="on_hold">En Pausa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <div>
              <Label htmlFor="change_reason">
                Razón del Cambio *
                {hasSignificantChanges && (
                  <span className="text-destructive text-sm ml-1">(Requerido para cambios significativos)</span>
                )}
              </Label>
              <Select value={changeReason} onValueChange={setChangeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la razón del cambio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_request">Solicitud del Cliente</SelectItem>
                  <SelectItem value="material_change">Cambio de Material</SelectItem>
                  <SelectItem value="price_update">Actualización de Precio</SelectItem>
                  <SelectItem value="quantity_adjustment">Ajuste de Cantidad</SelectItem>
                  <SelectItem value="specification_change">Cambio de Especificación</SelectItem>
                  <SelectItem value="error_correction">Corrección de Error</SelectItem>
                  <SelectItem value="improvement">Mejora del Proceso</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3">
              <Label htmlFor="change_comments">Comentarios Adicionales</Label>
              <Textarea
                id="change_comments"
                value={changeComments}
                onChange={(e) => setChangeComments(e.target.value)}
                placeholder="Describe en detalle el motivo del cambio..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isFormValid || isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};