/**
 * Subpartida Header - collapsible group header for WBS subpartidas
 */
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAsCurrency } from '../../utils/monetary';

interface SubpartidaHeaderProps {
  wbsCode: string;
  count: number;
  subtotal: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function SubpartidaHeader({
  wbsCode,
  count,
  subtotal,
  isCollapsed,
  onToggle,
  onDelete,
}: SubpartidaHeaderProps) {
  return (
    <div className="flex items-center bg-accent/30 border-b hover:bg-accent/50 group">
      <div className="w-12 border-r flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="px-3 py-2 font-medium flex-1 flex items-center gap-2">
        <span className="text-sm">WBS: {wbsCode}</span>
        <Badge variant="secondary">{count} conceptos</Badge>
        <span className="text-sm text-muted-foreground ml-auto">
          Subtotal: {formatAsCurrency(subtotal)}
        </span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
