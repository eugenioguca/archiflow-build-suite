import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useMatrixExplanations, MatrixExplanation } from '@/hooks/useMatrixExplanations';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MatrixExplanationsManagerProps {
  planId: string;
  className?: string;
}

interface SortableExplanationProps {
  explanation: MatrixExplanation;
  onEdit: (explanation: MatrixExplanation) => void;
  onDelete: (id: string) => void;
}

function SortableExplanation({ explanation, onEdit, onDelete }: SortableExplanationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: explanation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing text-muted-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {explanation.order_index + 1}
          </Badge>
          <h4 className="font-medium text-sm truncate">{explanation.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {explanation.description}
        </p>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(explanation)}
          className="h-8 w-8 p-0"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar explicación?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. La explicación será eliminada permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(explanation.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

interface ExplanationFormProps {
  initialData?: MatrixExplanation;
  onSubmit: (title: string, description: string) => Promise<void>;
  onClose: () => void;
}

function ExplanationForm({ initialData, onSubmit, onClose }: ExplanationFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    try {
      await onSubmit(title.trim(), description.trim());
      onClose();
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">
          Título
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ej. ANTICIPO, 1RA MIN, 2DA MIN"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">
          Descripción
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción detallada de qué incluye esta línea"
          rows={3}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !title.trim() || !description.trim()}>
          {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Agregar'}
        </Button>
      </div>
    </form>
  );
}

export function MatrixExplanationsManager({ planId, className }: MatrixExplanationsManagerProps) {
  const { explanations, loading, addExplanation, updateExplanation, deleteExplanation, reorderExplanations } = useMatrixExplanations(planId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExplanation, setEditingExplanation] = useState<MatrixExplanation | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = explanations.findIndex(item => item.id === active.id);
      const newIndex = explanations.findIndex(item => item.id === over.id);
      
      const newOrder = arrayMove(explanations, oldIndex, newIndex);
      reorderExplanations(newOrder);
    }
  };

  const handleAdd = async (title: string, description: string) => {
    await addExplanation(title, description);
  };

  const handleEdit = async (title: string, description: string) => {
    if (!editingExplanation) return;
    await updateExplanation(editingExplanation.id, { title, description });
    setEditingExplanation(null);
  };

  const openEditDialog = (explanation: MatrixExplanation) => {
    setEditingExplanation(explanation);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingExplanation(null);
  };

  if (!planId) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Selecciona un plan de cronograma para gestionar las explicaciones
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Explicaciones de la Matriz</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega explicaciones que aparecerán en el PDF de la Matriz Numérica
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingExplanation(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExplanation ? 'Editar Explicación' : 'Nueva Explicación'}
                </DialogTitle>
              </DialogHeader>
              <ExplanationForm
                initialData={editingExplanation || undefined}
                onSubmit={editingExplanation ? handleEdit : handleAdd}
                onClose={closeDialog}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando explicaciones...</p>
          </div>
        ) : explanations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-3">
              No hay explicaciones configuradas
            </p>
            <p className="text-xs text-muted-foreground">
              Las explicaciones aparecerán como una tabla de dos columnas en el PDF
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-4">
              Arrastra las explicaciones para cambiar su orden en el PDF
            </p>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={explanations.map(e => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {explanations.map((explanation) => (
                  <SortableExplanation
                    key={explanation.id}
                    explanation={explanation}
                    onEdit={openEditDialog}
                    onDelete={deleteExplanation}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}