/**
 * Editable Partida Row - inline editing for partidas with drag&drop
 */
import { useState } from 'react';
import { GripVertical, Edit2, Check, X, Trash2, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { PlanningPartida } from '../../types';

interface EditablePartidaRowProps {
  id: string;
  partida: PlanningPartida & { 
    tuPartidaNombre?: string; 
    tuPartidaCodigo?: string; 
  };
  isCollapsed: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PlanningPartida>) => void;
  onDelete: () => void;
  onAddSubpartida: () => void;
}

export function EditablePartidaRow({
  id,
  partida,
  isCollapsed,
  onToggle,
  onUpdate,
  onDelete,
  onAddSubpartida,
}: EditablePartidaRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(partida.name);
  const [editNotes, setEditNotes] = useState(partida.notes || '');
  const [editActive, setEditActive] = useState(partida.active);
  const [editHonorariosOverride, setEditHonorariosOverride] = useState<string>(
    partida.honorarios_pct_override !== null 
      ? (partida.honorarios_pct_override * 100).toFixed(2) 
      : ''
  );
  const [editDesperdicioOverride, setEditDesperdicioOverride] = useState<string>(
    partida.desperdicio_pct_override !== null 
      ? (partida.desperdicio_pct_override * 100).toFixed(2) 
      : ''
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handleSave = () => {
    // Validate numeric inputs
    const honorariosValue = editHonorariosOverride.trim();
    const desperdicioValue = editDesperdicioOverride.trim();
    
    let honorariosOverride: number | null = null;
    let desperdicioOverride: number | null = null;
    
    if (honorariosValue !== '') {
      const parsed = parseFloat(honorariosValue);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        toast.error('% Honorarios debe ser un número entre 0 y 100');
        return;
      }
      honorariosOverride = parsed / 100;
    }
    
    if (desperdicioValue !== '') {
      const parsed = parseFloat(desperdicioValue);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        toast.error('% Desperdicio debe ser un número entre 0 y 100');
        return;
      }
      desperdicioOverride = parsed / 100;
    }
    
    onUpdate({
      name: editName,
      notes: editNotes || null,
      active: editActive,
      honorarios_pct_override: honorariosOverride,
      desperdicio_pct_override: desperdicioOverride,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(partida.name);
    setEditNotes(partida.notes || '');
    setEditActive(partida.active);
    setEditHonorariosOverride(
      partida.honorarios_pct_override !== null 
        ? (partida.honorarios_pct_override * 100).toFixed(2) 
        : ''
    );
    setEditDesperdicioOverride(
      partida.desperdicio_pct_override !== null 
        ? (partida.desperdicio_pct_override * 100).toFixed(2) 
        : ''
    );
    setIsEditing(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-start bg-muted/50 border-b p-3 gap-2 ${isDragging ? 'z-50' : ''}`}
      >
        <div className="w-12 flex items-center justify-center">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
            aria-label="Arrastrar partida"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre de la partida"
            className="font-medium"
          />
          <Textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`honorarios-${partida.id}`} className="text-xs">
                % Honorarios Override
              </Label>
              <Input
                id={`honorarios-${partida.id}`}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={editHonorariosOverride}
                onChange={(e) => setEditHonorariosOverride(e.target.value)}
                placeholder="Default del budget"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`desperdicio-${partida.id}`} className="text-xs">
                % Desperdicio Override
              </Label>
              <Input
                id={`desperdicio-${partida.id}`}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={editDesperdicioOverride}
                onChange={(e) => setEditDesperdicioOverride(e.target.value)}
                placeholder="Default del budget"
                className="text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Deja vacío para usar los defaults del presupuesto
          </p>
          <div className="flex items-center gap-2">
            <Switch
              checked={editActive}
              onCheckedChange={setEditActive}
              id={`active-${partida.id}`}
            />
            <Label htmlFor={`active-${partida.id}`}>Activa</Label>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={handleSave}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-partida-id={partida.id}
      className={`flex items-center bg-muted/50 border-b hover:bg-muted group ${isDragging ? 'z-50' : ''}`}
    >
      <div className="w-12 flex items-center justify-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
          aria-label="Arrastrar partida"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="shrink-0"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      <div className="px-3 py-3 font-medium flex-1">
        <span className="text-xs font-mono text-primary mr-2">
          {partida.tuPartidaCodigo || partida.name}
        </span>
        {partida.tuPartidaNombre && (
          <span className="text-sm">{partida.tuPartidaNombre}</span>
        )}
        {partida.notes && (
          <span className="text-xs text-muted-foreground ml-2">({partida.notes})</span>
        )}
        {!partida.active && (
          <span className="text-xs text-destructive ml-2">[Inactiva]</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
        <Button size="sm" variant="ghost" onClick={onAddSubpartida}>
          <Plus className="h-4 w-4 mr-1" />
          Subpartida
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
