/**
 * TemplateApplyDialog - Planning v2
 * Diálogo para aplicar plantilla con confirmación de cambios
 */

import { useState } from 'react';
import { FileText, Plus, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TemplateDelta } from '../../types';

interface TemplateApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delta: TemplateDelta | null;
  templateName: string;
  onConfirm: () => Promise<void>;
  isApplying: boolean;
}

export function TemplateApplyDialog({
  open,
  onOpenChange,
  delta,
  templateName,
  onConfirm,
  isApplying
}: TemplateApplyDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!delta) return null;

  const hasChanges =
    delta.partidas_to_add.length > 0 ||
    delta.conceptos_to_add.length > 0 ||
    delta.fields_to_add.length > 0 ||
    delta.existing_conceptos_to_update.length > 0;

  const handleConfirm = async () => {
    await onConfirm();
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aplicar Plantilla: {templateName}
          </DialogTitle>
          <DialogDescription>
            Revisa los cambios que se aplicarán al presupuesto
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {/* Partidas nuevas */}
            {delta.partidas_to_add.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold">
                    Partidas a crear ({delta.partidas_to_add.length})
                  </h4>
                </div>
                <div className="space-y-1 ml-6">
                  {delta.partidas_to_add.map((partida) => (
                    <div
                      key={partida.id}
                      className="text-sm text-muted-foreground"
                    >
                      • {partida.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conceptos nuevos */}
            {delta.conceptos_to_add.length > 0 && (
              <div>
                <Separator className="my-4" />
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold">
                    Conceptos a crear ({delta.conceptos_to_add.length})
                  </h4>
                </div>
                <div className="space-y-2 ml-6">
                  {delta.conceptos_to_add.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <Badge variant="outline" className="mb-1">
                        {item.partida_name}
                      </Badge>
                      <div className="text-muted-foreground">
                        • {item.concepto.short_description}
                        <span className="text-xs ml-2">
                          ({item.concepto.unit})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campos dinámicos */}
            {delta.fields_to_add.length > 0 && (
              <div>
                <Separator className="my-4" />
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold">
                    Campos dinámicos ({delta.fields_to_add.length})
                  </h4>
                </div>
                <div className="space-y-1 ml-6">
                  {delta.fields_to_add.map((field) => (
                    <div
                      key={field.id}
                      className="text-sm text-muted-foreground"
                    >
                      • {field.field_label}
                      <Badge
                        variant="secondary"
                        className="ml-2 text-xs"
                      >
                        {field.field_role === 'input' ? 'Entrada' : 'Calculado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actualizaciones */}
            {delta.existing_conceptos_to_update.length > 0 && (
              <div>
                <Separator className="my-4" />
                <div className="flex items-center gap-2 mb-2">
                  <Edit className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold">
                    Conceptos a actualizar ({delta.existing_conceptos_to_update.length})
                  </h4>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  Se actualizarán {delta.existing_conceptos_to_update.length} conceptos existentes
                </div>
              </div>
            )}

            {/* Sin cambios */}
            {!hasChanges && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay cambios que aplicar</p>
                <p className="text-sm">
                  El presupuesto ya contiene todos los elementos de la plantilla
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasChanges || isApplying}
          >
            {isApplying ? 'Aplicando...' : 'Confirmar y Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
