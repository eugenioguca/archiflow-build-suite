import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DraggableConceptoRowProps {
  id: string;
  concepto: any;
  isSelected: boolean;
  isZeroQuantity: boolean;
  visibleColumns: any[];
  onToggleSelection: () => void;
  onRowClick: () => void;
  renderCell: (concepto: any, column: any) => React.ReactNode;
  actionsContent?: React.ReactNode;
}

export function DraggableConceptoRow({
  id,
  concepto,
  isSelected,
  isZeroQuantity,
  visibleColumns,
  onToggleSelection,
  onRowClick,
  renderCell,
  actionsContent,
}: DraggableConceptoRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const rowContent = (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center border-b hover:bg-muted/30 cursor-pointer ${
        isSelected ? 'bg-primary/10' : ''
      } ${isDragging ? 'z-50' : ''}`}
      onClick={onRowClick}
    >
      <div className="w-12 border-r flex items-center justify-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="rounded"
        />
      </div>
      {visibleColumns.map((col) => (
        <div
          key={col.key}
          className={`px-3 py-2 text-sm border-r min-w-[120px] max-w-[200px] ${
            col.type === 'computed' ? 'bg-muted/10' : ''
          }`}
        >
          <div className="plv2-concepto-cell">
            {renderCell(concepto, col)}
          </div>
        </div>
      ))}
      {actionsContent && (
        <div className="px-2 py-2 flex items-center justify-center border-r w-[60px]" onClick={(e) => e.stopPropagation()}>
          {actionsContent}
        </div>
      )}
    </div>
  );

  if (isZeroQuantity) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {rowContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>Cantidad en 0: este renglón no suma.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return rowContent;
}
