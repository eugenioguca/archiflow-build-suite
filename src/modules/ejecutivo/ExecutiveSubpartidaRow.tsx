import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { MoneyInput } from '@/components/ui/money-input';
import { Trash2, Save, X } from 'lucide-react';
import { useSubpartidas } from './hooks/useSubpartidas';

interface ExecutiveSubpartidaRowProps {
  item: ExecutiveItem | null;
  onUpdate?: (data: Partial<ExecutiveItem>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSave?: (data: Partial<ExecutiveItem>) => Promise<void>;
  onCancel?: () => void;
}

interface ExecutiveItem {
  id: string;
  cliente_id: string;
  proyecto_id: string;
  presupuesto_parametrico_id: string;
  departamento: string;
  mayor_id: string;
  partida_id: string;
  subpartida_id: string;
  unidad: string;
  cantidad_requerida: number;
  precio_unitario: number;
  monto_total: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  mayor?: { codigo: string; nombre: string };
  partida?: { codigo: string; nombre: string };
  subpartida?: { codigo: string; nombre: string };
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
    subpartida_id: item?.subpartida_id || '',
    nombre_subpartida: item?.subpartida?.nombre || '',
    unidad: item?.unidad || 'PZA',
    cantidad_requerida: item?.cantidad_requerida || 1,
    precio_unitario: item?.precio_unitario || 0,
  });

  // Hook para buscar subpartidas del catálogo TU - pass context if available
  const { 
    subpartidas, 
    isLoadingSubpartidas,
    totalCount
  } = useSubpartidas('CONSTRUCCIÓN', undefined, undefined);

  const total = formData.cantidad_requerida * formData.precio_unitario;

  const handleSave = async () => {
    // Validaciones
    if (!formData.subpartida_id) {
      return; // No guardar si no hay subpartida seleccionada
    }
    if (formData.cantidad_requerida <= 0) {
      return; // Validar cantidad positiva
    }
    if (formData.precio_unitario < 0) {
      return; // Validar precio no negativo
    }

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
        subpartida_id: item?.subpartida_id || '',
        nombre_subpartida: item?.subpartida?.nombre || '',
        unidad: item?.unidad || 'PZA',
        cantidad_requerida: item?.cantidad_requerida || 1,
        precio_unitario: item?.precio_unitario || 0,
      });
    }
  };

  const handleSubpartidaSelect = (subpartidaId: string) => {
    const selectedSubpartida = subpartidas.find(s => s.value === subpartidaId);
    setFormData(prev => ({
      ...prev,
      subpartida_id: subpartidaId,
      nombre_subpartida: selectedSubpartida?.label || '',
      // Pre-llenar unidad si está disponible en la subpartida
      unidad: (selectedSubpartida as any)?.unidad_default || prev.unidad
    }));
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
        <SearchableCombobox
          items={subpartidas}
          value={formData.subpartida_id}
          onValueChange={handleSubpartidaSelect}
          placeholder="Buscar subpartida..."
          searchPlaceholder={`Escriba para buscar... (${totalCount} disponibles)`}
          emptyText="No se encontraron subpartidas"
          loading={isLoadingSubpartidas}
          showCodes={true}
          searchFields={['label', 'codigo']}
          virtualized={true}
          className="col-span-1"
        />
        
        <Select
          value={formData.unidad}
          onValueChange={(value) => setFormData({ ...formData, unidad: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PZA">Pieza</SelectItem>
            <SelectItem value="M">Metro</SelectItem>
            <SelectItem value="M2">Metro²</SelectItem>
            <SelectItem value="M3">Metro³</SelectItem>
            <SelectItem value="ML">Metro Lineal</SelectItem>
            <SelectItem value="KG">Kilogramo</SelectItem>
            <SelectItem value="TON">Tonelada</SelectItem>
            <SelectItem value="LT">Litro</SelectItem>
            <SelectItem value="GAL">Galón</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.cantidad_requerida}
          onChange={(e) => setFormData({ ...formData, cantidad_requerida: parseFloat(e.target.value) || 0 })}
          className="text-center"
          placeholder="Cantidad"
        />
        
        <MoneyInput
          value={formData.precio_unitario}
          onChange={(value) => setFormData({ ...formData, precio_unitario: value })}
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
              disabled={!formData.subpartida_id || formData.cantidad_requerida <= 0}
              className="text-green-600 hover:text-green-700 disabled:opacity-50"
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