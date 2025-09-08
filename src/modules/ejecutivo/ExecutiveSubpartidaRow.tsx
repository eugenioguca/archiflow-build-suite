import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TUSubpartidaField, TUUnidadField } from '@/components/shared/TUFieldComponents';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';
import type { SelectedParametric } from './ExecutiveBudgetPage';

interface ExecutiveSubpartidaRowProps {
  item: PresupuestoEjecutivo | null;
  parametric?: SelectedParametric;
  onUpdate?: (id: string, data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSave?: (data: any) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  searchTerm?: string;
}

export function ExecutiveSubpartidaRow({
  item,
  parametric,
  onUpdate,
  onDelete,
  onSave,
  onCancel,
  isEditing: initialEditing = false,
  searchTerm = ''
}: ExecutiveSubpartidaRowProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    subpartida_id: item?.subpartida_id || '',
    unidad: item?.unidad || 'PZA',
    cantidad_requerida: item?.cantidad_requerida || 1,
    precio_unitario: item?.precio_unitario || 0,
    notas: '' // Additional field for notes
  });

  // Auto-calculate total
  const montoTotal = useMemo(() => {
    return Math.round((formData.cantidad_requerida * formData.precio_unitario) * 100) / 100;
  }, [formData.cantidad_requerida, formData.precio_unitario]);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        subpartida_id: item.subpartida_id,
        unidad: item.unidad,
        cantidad_requerida: item.cantidad_requerida,
        precio_unitario: item.precio_unitario,
        notas: ''
      });
    }
  }, [item]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (item) {
      // Reset to original values
      setFormData({
        subpartida_id: item.subpartida_id,
        unidad: item.unidad,
        cantidad_requerida: item.cantidad_requerida,
        precio_unitario: item.precio_unitario,
        notas: ''
      });
      setIsEditing(false);
    } else {
      // This is a new item
      onCancel?.();
    }
  };

  const handleSave = async () => {
    if (!formData.subpartida_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar una subpartida",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        monto_total: montoTotal
      };

      if (item) {
        // Update existing
        await onUpdate?.(item.id, dataToSave);
        setIsEditing(false);
      } else {
        // Create new
        await onSave?.(dataToSave);
      }
    } catch (error) {
      console.error('Error saving subpartida:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    
    if (window.confirm('¿Está seguro de eliminar esta subpartida?')) {
      setIsLoading(true);
      try {
        await onDelete?.(item.id);
      } catch (error) {
        console.error('Error deleting subpartida:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const updateFormField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Highlight search matches
  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-background border-l-4 border-l-primary">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Subpartida Selector */}
          <div className="md:col-span-2">
            <TUSubpartidaField
              partidaId={parametric?.partida_id}
              value={formData.subpartida_id}
              onValueChange={(value) => updateFormField('subpartida_id', value)}
            />
          </div>

          {/* Unidad */}
          <div>
            <TUUnidadField
              value={formData.unidad}
              onValueChange={(value) => updateFormField('unidad', value)}
            />
          </div>

          {/* Cantidad */}
          <div>
            <label className="text-sm font-medium">Cantidad</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.cantidad_requerida}
              onChange={(e) => updateFormField('cantidad_requerida', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>

          {/* Precio Unitario */}
          <div>
            <label className="text-sm font-medium">Precio Unit.</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.precio_unitario}
              onChange={(e) => updateFormField('precio_unitario', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              size="sm"
              disabled={isSaving || !formData.subpartida_id}
              className="gap-1"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="outline"
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Auto-calculated total */}
        <div className="mt-2 text-right">
          <span className="text-sm text-muted-foreground">Total: </span>
          <span className="text-lg font-bold text-primary">
            ${montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }

  // Read-only view
  if (!item) return null;

  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Subpartida Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {item.subpartida?.codigo} - {item.subpartida?.nombre}
              </span>
              {searchTerm && (
                <Badge variant="outline" className="text-xs">
                  Match
                </Badge>
              )}
            </div>
          </div>

          {/* Unidad */}
          <div>
            <Badge variant="secondary">{item.unidad}</Badge>
          </div>

          {/* Cantidad */}
          <div className="text-right">
            <span className="font-medium">{item.cantidad_requerida}</span>
          </div>

          {/* Precio Unitario */}
          <div className="text-right">
            <span className="font-medium">
              ${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Total and Actions */}
        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              ${item.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            {item.created_at && (
              <div className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString('es-MX')}
              </div>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              onClick={handleEdit}
              size="sm"
              variant="ghost"
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleDelete}
              size="sm"
              variant="ghost"
              disabled={isLoading}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}