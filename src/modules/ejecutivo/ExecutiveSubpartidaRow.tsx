import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, X } from 'lucide-react';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';

interface ExecutiveSubpartidaRowProps {
  item: PresupuestoEjecutivo | null;
  onUpdate?: (data: Partial<PresupuestoEjecutivo>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSave?: (data: Partial<PresupuestoEjecutivo>) => Promise<void>;
  onCancel?: () => void;
}

export function ExecutiveSubpartidaRow({
  item,
  onUpdate,
  onDelete,
  onSave,
  onCancel
}: ExecutiveSubpartidaRowProps) {
  const [isEditing, setIsEditing] = useState(!item);
  const [formData, setFormData] = useState({
    unidad: item?.unidad || 'pza',
    cantidad_requerida: item?.cantidad_requerida || 1,
    precio_unitario: item?.precio_unitario || 0,
  });

  const total = formData.cantidad_requerida * formData.precio_unitario;

  const handleSave = async () => {
    if (onSave) {
      await onSave(formData);
    } else if (onUpdate) {
      await onUpdate(formData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setIsEditing(false);
      setFormData({
        unidad: item?.unidad || 'pza',
        cantidad_requerida: item?.cantidad_requerida || 1,
        precio_unitario: item?.precio_unitario || 0,
      });
    }
  };

  if (!isEditing && item) {
    return (
      <div 
        className="p-3 bg-muted/20 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setIsEditing(true)}
      >
        <div className="grid grid-cols-5 gap-4 items-center">
          <div className="col-span-1">
            <p className="font-medium">{item.subpartida?.nombre || 'Subpartida'}</p>
            <p className="text-xs text-muted-foreground">
              {item.subpartida?.codigo || 'Sin código'}
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium">{item.unidad}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium">{item.cantidad_requerida}</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium">
              ${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              ${item.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onDelete();
                }}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-background border rounded-lg">
      <div className="grid grid-cols-5 gap-4 items-center">
        <Input
          type="text"
          placeholder="Descripción de subpartida"
          value="Nueva subpartida"
          disabled
          className="col-span-1 bg-muted/30"
        />
        
        <Select
          value={formData.unidad}
          onValueChange={(value) => setFormData({ ...formData, unidad: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pza">Pieza</SelectItem>
            <SelectItem value="m">Metro</SelectItem>
            <SelectItem value="m2">Metro²</SelectItem>
            <SelectItem value="m3">Metro³</SelectItem>
            <SelectItem value="kg">Kilogramo</SelectItem>
            <SelectItem value="ton">Tonelada</SelectItem>
            <SelectItem value="lt">Litro</SelectItem>
            <SelectItem value="global">Global</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          type="number"
          step="0.01"
          value={formData.cantidad_requerida}
          onChange={(e) => setFormData({ ...formData, cantidad_requerida: parseFloat(e.target.value) || 0 })}
          className="text-center"
        />
        
        <Input
          type="number"
          step="0.01"
          value={formData.precio_unitario}
          onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0 })}
          className="text-right"
        />
        
        <div className="flex items-center justify-between">
          <span className="font-semibold">
            ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              className="text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}