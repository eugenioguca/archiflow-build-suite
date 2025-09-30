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
import type { PlanningPartida } from '../../types';

interface EditablePartidaRowProps {
  id: string;
  partida: PlanningPartida;
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handleSave = () => {
    onUpdate({
      name: editName,
      notes: editNotes || null,
      active: editActive,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(partida.name);
    setEditNotes(partida.notes || '');
    setEditActive(partida.active);
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
        {partida.name}
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
