/**
 * Catalog Row Actions - Actions for partida/concepto rows
 */
import { useState } from 'react';
import { MoreHorizontal, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TURegistrationDialog } from './TURegistrationDialog';
import { PLANNING_V2_TU_CAPTURE } from '../../config/featureFlag';
import type { CatalogRow } from '../../hooks/useCatalogGrid';

interface CatalogRowActionsProps {
  row: CatalogRow;
  budgetId: string;
  projectId: string;
  clientId: string;
  onDelete?: () => void;
}

export function CatalogRowActions({
  row,
  budgetId,
  projectId,
  clientId,
  onDelete,
}: CatalogRowActionsProps) {
  const [showTUDialog, setShowTUDialog] = useState(false);

  const isConcepto = row.type === 'concepto' && row.concepto;
  const canRegisterInTU = PLANNING_V2_TU_CAPTURE && isConcepto && row.concepto?.sumable;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canRegisterInTU && (
            <>
              <DropdownMenuItem onClick={() => setShowTUDialog(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Registrar en TU
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {onDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canRegisterInTU && showTUDialog && row.concepto && (
        <TURegistrationDialog
          open={showTUDialog}
          onOpenChange={setShowTUDialog}
          conceptoId={row.id}
          budgetId={budgetId}
          projectId={projectId}
          clientId={clientId}
          provider={row.concepto.provider}
          conceptName={row.concepto.short_description || row.concepto.code}
          unit={row.concepto.unit || ''}
          defaultQuantity={row.concepto.cantidad_real || 0}
          defaultTotal={row.concepto.total || 0}
        />
      )}
    </>
  );
}
