import { usePresupuestoParametrico } from '@/hooks/usePresupuestoParametrico';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import type { SelectedParametric } from './ExecutiveBudgetPage';

interface ParametricPickerProps {
  clientId: string;
  projectId: string;
  selectedParametric: SelectedParametric | null;
  onParametricChange: (parametric: SelectedParametric | null) => void;
}

export function ParametricPicker({ 
  clientId, 
  projectId, 
  selectedParametric, 
  onParametricChange 
}: ParametricPickerProps) {
  const { presupuestos, isLoading } = usePresupuestoParametrico(clientId, projectId);

  const parametricOptions = presupuestos.map(p => ({
    value: p.id,
    label: `${p.mayor?.codigo} - ${p.partida?.codigo} | $${p.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    searchText: `${p.mayor?.codigo} ${p.mayor?.nombre} ${p.partida?.codigo} ${p.partida?.nombre}`.toLowerCase()
  }));

  const handleParametricSelect = (parametricId: string) => {
    const selected = presupuestos.find(p => p.id === parametricId);
    if (selected) {
      onParametricChange({
        id: selected.id,
        departamento: selected.departamento,
        mayor_id: selected.mayor_id,
        mayor_codigo: selected.mayor?.codigo || '',
        mayor_nombre: selected.mayor?.nombre || '',
        partida_id: selected.partida_id,
        partida_codigo: selected.partida?.codigo || '',
        partida_nombre: selected.partida?.nombre || '',
        cantidad_requerida: selected.cantidad_requerida,
        precio_unitario: selected.precio_unitario,
        monto_total: selected.monto_total
      });
    } else {
      onParametricChange(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Seleccionar Presupuesto Paramétrico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SearchableCombobox
          items={parametricOptions}
          value={selectedParametric?.id || ''}
          onValueChange={handleParametricSelect}
          placeholder="Buscar presupuesto paramétrico..."
          searchPlaceholder="Buscar por código, nombre o importe..."
          emptyText="No se encontraron presupuestos paramétricos."
          loading={isLoading}
          className="w-full"
        />
        
        {selectedParametric && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Departamento:</span>
                <p className="font-semibold">{selectedParametric.departamento}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Mayor:</span>
                <p className="font-semibold">{selectedParametric.mayor_codigo} - {selectedParametric.mayor_nombre}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Partida:</span>
                <p className="font-semibold">{selectedParametric.partida_codigo} - {selectedParametric.partida_nombre}</p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Cantidad:</span>
                <span className="ml-2 font-semibold">{selectedParametric.cantidad_requerida}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Precio Unitario:</span>
                <span className="ml-2 font-semibold">
                  ${selectedParametric.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-lg font-bold text-primary">
                ${selectedParametric.monto_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}