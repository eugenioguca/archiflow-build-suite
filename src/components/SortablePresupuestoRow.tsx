import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, GripVertical } from 'lucide-react';
import { PresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';

interface SortablePresupuestoRowProps {
  item: PresupuestoParametrico;
  onEdit: (item: PresupuestoParametrico) => void;
  onDelete: (id: string) => void;
}

export function SortablePresupuestoRow({ item, onEdit, onDelete }: SortablePresupuestoRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted/50' : ''}>
      <TableCell>
        <Badge variant="secondary">{item.departamento}</Badge>
      </TableCell>
      <TableCell>
        {item.mayor?.codigo} - {item.mayor?.nombre}
      </TableCell>
      <TableCell>
        {item.partida?.codigo} - {item.partida?.nombre}
      </TableCell>
      <TableCell>{item.cantidad_requerida}</TableCell>
      <TableCell>
        ${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell className="font-semibold">
        ${item.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 items-center">
          {/* Drag handle */}
          <Button
            variant="ghost"
            size="sm"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
            {...attributes}
            {...listeners}
            aria-label="Reordenar partida"
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          
          {/* Edit button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="text-blue-600 hover:text-blue-700 p-1"
            aria-label="Editar partida"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="text-red-600 hover:text-red-700 p-1"
            aria-label="Eliminar partida"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}