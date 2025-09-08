import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  DollarSign 
} from 'lucide-react';
import { ExecutiveSubpartidaRow } from './ExecutiveSubpartidaRow';
import type { SelectedParametric } from './ExecutiveBudgetPage';
import type { PresupuestoEjecutivo } from '@/hooks/usePresupuestoEjecutivo';

interface ExecutivePartidaRowProps {
  parametric: SelectedParametric;
  executiveItems: PresupuestoEjecutivo[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  searchTerm: string;
  onCreateItem: any;
  onUpdateItem: any;
  onDeleteItem: any;
}

export function ExecutivePartidaRow({
  parametric,
  executiveItems,
  isExpanded,
  onToggleExpanded,
  searchTerm,
  onCreateItem,
  onUpdateItem,
  onDeleteItem
}: ExecutivePartidaRowProps) {
  const [isAddingSubpartida, setIsAddingSubpartida] = useState(false);

  // Calculate totals and status
  const totalExecutive = executiveItems.reduce((sum, item) => sum + item.monto_total, 0);
  const difference = totalExecutive - parametric.monto_total;
  const isWithinBudget = Math.abs(difference) < 0.01;
  const isOverBudget = difference > 0.01;
  const progressPercentage = parametric.monto_total > 0 ? (totalExecutive / parametric.monto_total) * 100 : 0;

  const handleAddSubpartida = () => {
    setIsAddingSubpartida(true);
  };

  const handleSaveNewSubpartida = async (data: any) => {
    try {
      await onCreateItem({
        ...data,
        presupuesto_parametrico_id: parametric.id,
        departamento: parametric.departamento,
        mayor_id: parametric.mayor_id,
        partida_id: parametric.partida_id
      });
      setIsAddingSubpartida(false);
    } catch (error) {
      console.error('Error creating subpartida:', error);
    }
  };

  const handleCancelNewSubpartida = () => {
    setIsAddingSubpartida(false);
  };

  // Filter subpartidas based on search
  const filteredSubpartidas = executiveItems.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.subpartida?.nombre?.toLowerCase().includes(searchLower) ||
      item.subpartida?.codigo?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="border-b last:border-b-0">
      {/* Partida Header Row */}
      <div className="p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="p-1 h-8 w-8"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-base">
                  {parametric.partida_codigo} - {parametric.partida_nombre}
                </h4>
                {isWithinBudget ? (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : isOverBudget ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Sobrepresupuesto
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-blue-700 bg-blue-50">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Disponible
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground mb-2">
                {parametric.departamento} → {parametric.mayor_codigo} - {parametric.mayor_nombre}
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3 mb-2">
                <Progress 
                  value={Math.min(progressPercentage, 100)} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium min-w-[60px]">
                  {progressPercentage.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Paramétrico:</span>
                  <span className="ml-2 font-semibold">
                    ${parametric.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ejecutivo:</span>
                  <span className="ml-2 font-semibold">
                    ${totalExecutive.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={isOverBudget ? "text-red-600" : difference < 0 ? "text-blue-600" : "text-green-600"}>
                  <span className="text-muted-foreground">Diferencia:</span>
                  <span className="ml-2 font-semibold">
                    {difference >= 0 ? '+' : ''}${difference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddSubpartida}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Subpartida
          </Button>
        </div>
      </div>

      {/* Expanded Content - Subpartidas */}
      {isExpanded && (
        <div className="bg-muted/20 border-t">
          {/* Subpartidas List */}
          {filteredSubpartidas.length > 0 && (
            <div className="divide-y">
              {filteredSubpartidas.map((item) => (
                <ExecutiveSubpartidaRow
                  key={item.id}
                  item={item}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}

          {/* New Subpartida Form */}
          {isAddingSubpartida && (
            <div className="border-t bg-background">
              <ExecutiveSubpartidaRow
                item={null}
                onSave={handleSaveNewSubpartida}
                onCancel={handleCancelNewSubpartida}
                isEditing={true}
                parametric={parametric}
              />
            </div>
          )}

          {/* Empty State */}
          {filteredSubpartidas.length === 0 && !isAddingSubpartida && (
            <div className="p-8 text-center">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="font-medium mb-2">Sin subpartidas</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Esta partida no tiene subpartidas definidas aún.
              </p>
              <Button onClick={handleAddSubpartida} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar primera subpartida
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}