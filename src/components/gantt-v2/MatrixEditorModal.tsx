import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Undo,
  Calculator,
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { formatCurrency } from '@/utils/gantt-v2/currency';
import { expandRangeToMonthWeekCells } from '@/utils/gantt-v2/weekMath';

interface MatrixEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: GanttPlan;
  lines: GanttLine[];
  overrides: MatrixOverride[];
  clientId: string;
  projectId: string;
  onSaveOverride: (data: Omit<MatrixOverride, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteOverride: (data: { mes: string; concepto: string }) => Promise<void>;
}

export function MatrixEditorModal({
  open,
  onOpenChange,
  plan,
  lines,
  overrides,
  clientId,
  projectId,
  onSaveOverride,
  onDeleteOverride
}: MatrixEditorModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});

  const monthRange = generateMonthRange(plan.start_month, plan.months_count);
  const mayorLines = lines.filter(line => !line.is_discount);
  const totalSubtotal = mayorLines.reduce((sum, line) => sum + line.amount, 0);

  // Calculate automatic values (same logic as MatrixSection)
  const calculateAutomaticValues = () => {
    const gastoEnObra: Record<string, number> = {};
    const avanceAcumulado: Record<string, number> = {};
    const avanceParcial: Record<string, number> = {};

    // Calculate "Gasto en Obra" distribution
    monthRange.forEach(month => {
      let monthTotal = 0;
      
      mayorLines.forEach(line => {
        if (!line.activities || line.activities.length === 0) return;
        
        let activeWeeksInMonth = 0;
        line.activities.forEach(activity => {
          const cells = expandRangeToMonthWeekCells(
            activity.start_month,
            activity.start_week,
            activity.end_month,
            activity.end_week
          );
          
          activeWeeksInMonth += cells.filter(cell => cell.month === month.value).length;
        });
        
        let totalActiveWeeks = 0;
        line.activities.forEach(activity => {
          const cells = expandRangeToMonthWeekCells(
            activity.start_month,
            activity.start_week,
            activity.end_month,
            activity.end_week
          );
          totalActiveWeeks += cells.length;
        });
        
        if (totalActiveWeeks > 0) {
          const proportionalAmount = (line.amount * activeWeeksInMonth) / totalActiveWeeks;
          monthTotal += proportionalAmount;
        }
      });
      
      gastoEnObra[month.value] = monthTotal;
    });

    // Calculate cumulative and partial progress
    let cumulativeSpending = 0;
    monthRange.forEach(month => {
      cumulativeSpending += gastoEnObra[month.value] || 0;
      avanceAcumulado[month.value] = totalSubtotal > 0 ? (cumulativeSpending / totalSubtotal) * 100 : 0;
      
      const monthSpending = gastoEnObra[month.value] || 0;
      avanceParcial[month.value] = totalSubtotal > 0 ? (monthSpending / totalSubtotal) * 100 : 0;
    });

    return { gastoEnObra, avanceAcumulado, avanceParcial };
  };

  const automaticValues = calculateAutomaticValues();

  // Helper function to get override value or calculated value
  const getValueOrDefault = (mes: string, concepto: string, defaultValue: number | string = 0): string => {
    const override = overrides.find(o => o.mes === parseInt(mes, 10) && o.concepto === concepto);
    if (override) return override.valor;
    
    // Return automatic values for auto-calculated fields
    switch (concepto) {
      case 'gasto_obra':
        return (automaticValues.gastoEnObra[mes] || 0).toString();
      case 'avance_parcial':
        return (automaticValues.avanceParcial[mes] || 0).toFixed(2);
      case 'avance_acumulado':
        return (automaticValues.avanceAcumulado[mes] || 0).toFixed(2);
      default:
        return defaultValue.toString();
    }
  };

  const hasOverride = (mes: string, concepto: string): boolean => {
    return overrides.some(o => o.mes === parseInt(mes, 10) && o.concepto === concepto);
  };

  // Initialize form data
  useEffect(() => {
    if (open) {
      const initialData: Record<string, Record<string, string>> = {};
      
      monthRange.forEach(month => {
        initialData[month.value] = {
          gasto_obra: getValueOrDefault(month.value, 'gasto_obra'),
          avance_parcial: getValueOrDefault(month.value, 'avance_parcial'),
          avance_acumulado: getValueOrDefault(month.value, 'avance_acumulado'),
          ministraciones: getValueOrDefault(month.value, 'ministraciones'),
          inversion_acumulada: getValueOrDefault(month.value, 'inversion_acumulada'),
          fecha_pago: getValueOrDefault(month.value, 'fecha_pago', ''),
        };
      });
      
      setFormData(initialData);
    }
  }, [open, monthRange, overrides]);

  const handleInputChange = (month: string, concepto: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [month]: {
        ...prev[month] || {},
        [concepto]: value
      }
    }));
  };

  const handleResetField = async (month: string, concepto: string) => {
    try {
      await onDeleteOverride({ mes: month, concepto });
      
      // Reset to automatic value
      const automaticValue = getValueOrDefault(month, concepto);
      setFormData(prev => ({
        ...prev,
        [month]: {
          ...prev[month] || {},
          [concepto]: automaticValue
        }
      }));

      toast({
        title: "Campo restablecido",
        description: `El valor ha sido restablecido al valor automático.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo restablecer el campo.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const overridesToSave: Array<Omit<MatrixOverride, 'id' | 'created_at' | 'updated_at'>> = [];
      
      monthRange.forEach(month => {
        const monthData = formData[month.value];
        if (!monthData) return;
        
        Object.entries(monthData).forEach(([concepto, valor]) => {
          const automaticValue = getValueOrDefault(month.value, concepto);
          const isOverride = valor !== automaticValue;
          
          if (isOverride && valor.trim() !== '') {
            overridesToSave.push({
              cliente_id: clientId,
              proyecto_id: projectId,
              mes: parseInt(month.value, 10),
              concepto,
              valor: valor.trim()
            });
          }
        });
      });
      
      // Save all overrides
      for (const override of overridesToSave) {
        await onSaveOverride(override);
      }
      
      toast({
        title: "Matriz guardada",
        description: `Se han guardado ${overridesToSave.length} valores personalizados.`
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error saving matrix:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la matriz.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validatePercentage = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  const validateCurrency = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden z-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Editor de Matriz Mensual - Gantt v2
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {monthRange.length} meses
              </Badge>
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                Presupuesto: {formatCurrency(totalSubtotal)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {overrides.length} valores personalizados
            </div>
          </div>

          <Tabs defaultValue="editable" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editable">Campos Editables</TabsTrigger>
              <TabsTrigger value="overrides">Overrides Automáticos</TabsTrigger>
            </TabsList>

            {/* Editable Fields Tab */}
            <TabsContent value="editable" className="space-y-6">
              {/* Ministraciones */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Ministraciones (MXN)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthRange.map(month => {
                    const isOverridden = hasOverride(month.value, 'ministraciones');
                    const value = formData[month.value]?.ministraciones || '0';
                    const isValid = validateCurrency(value);
                    
                    return (
                      <div key={month.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {month.label}
                          </Label>
                          {isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleResetField(month.value, 'ministraciones')}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={value}
                            onChange={(e) => handleInputChange(month.value, 'ministraciones', e.target.value)}
                            className={`text-right ${!isValid ? 'border-destructive' : ''} ${isOverridden ? 'bg-amber-50 border-amber-300' : ''}`}
                            placeholder="0.00"
                            tabIndex={0}
                          />
                          {!isValid && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(parseFloat(value) || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* % Inversión Acumulada */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold">% Inversión Acumulada</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthRange.map(month => {
                    const isOverridden = hasOverride(month.value, 'inversion_acumulada');
                    const value = formData[month.value]?.inversion_acumulada || '0';
                    const isValid = validatePercentage(value);
                    
                    return (
                      <div key={month.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {month.label}
                          </Label>
                          {isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleResetField(month.value, 'inversion_acumulada')}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(e) => handleInputChange(month.value, 'inversion_acumulada', e.target.value)}
                            className={`text-right ${!isValid ? 'border-destructive' : ''} ${isOverridden ? 'bg-amber-50 border-amber-300' : ''}`}
                            placeholder="0.00"
                            tabIndex={0}
                          />
                          {!isValid && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {parseFloat(value || '0').toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fechas de Pago */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold">Fechas Tentativas de Pago</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthRange.map(month => {
                    const isOverridden = hasOverride(month.value, 'fecha_pago');
                    const value = formData[month.value]?.fecha_pago || '';
                    
                    return (
                      <div key={month.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {month.label}
                          </Label>
                          {isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleResetField(month.value, 'fecha_pago')}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <Select
                          value={value}
                          onValueChange={(val) => handleInputChange(month.value, 'fecha_pago', val)}
                        >
                          <SelectTrigger className={`${isOverridden ? 'bg-amber-50 border-amber-300' : ''}`}>
                            <SelectValue placeholder="Seleccionar día..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="none">Sin fecha</SelectItem>
                            <SelectItem value="Pago 1">Pago 1</SelectItem>
                            <SelectItem value="Pago 2">Pago 2</SelectItem>
                            <SelectItem value="Pago 3">Pago 3</SelectItem>
                            <SelectItem value="Primera Quincena">Primera Quincena</SelectItem>
                            <SelectItem value="Segunda Quincena">Segunda Quincena</SelectItem>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                Día {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Overrides Tab */}
            <TabsContent value="overrides" className="space-y-6">
              {/* Gasto en Obra */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Gasto en Obra (Override Opcional)</h3>
                  <Badge variant="secondary" className="text-xs">Calculado automáticamente</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthRange.map(month => {
                    const isOverridden = hasOverride(month.value, 'gasto_obra');
                    const value = formData[month.value]?.gasto_obra || '0';
                    const automaticValue = automaticValues.gastoEnObra[month.value] || 0;
                    const isValid = validateCurrency(value);
                    
                    return (
                      <div key={month.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {month.label}
                          </Label>
                          {isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleResetField(month.value, 'gasto_obra')}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={value}
                            onChange={(e) => handleInputChange(month.value, 'gasto_obra', e.target.value)}
                            className={`text-right ${!isValid ? 'border-destructive' : ''} ${isOverridden ? 'bg-amber-50 border-amber-300' : ''}`}
                            placeholder={automaticValue.toFixed(2)}
                            tabIndex={0}
                          />
                          {!isValid && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Auto: {formatCurrency(automaticValue)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Similar patterns for avance_parcial and avance_acumulado */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">% Avance Parcial (Override Opcional)</h3>
                  <Badge variant="secondary" className="text-xs">Calculado automáticamente</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthRange.map(month => {
                    const isOverridden = hasOverride(month.value, 'avance_parcial');
                    const value = formData[month.value]?.avance_parcial || '0';
                    const automaticValue = automaticValues.avanceParcial[month.value] || 0;
                    const isValid = validatePercentage(value);
                    
                    return (
                      <div key={month.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {month.label}
                          </Label>
                          {isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleResetField(month.value, 'avance_parcial')}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(e) => handleInputChange(month.value, 'avance_parcial', e.target.value)}
                            className={`text-right ${!isValid ? 'border-destructive' : ''} ${isOverridden ? 'bg-amber-50 border-amber-300' : ''}`}
                            placeholder={automaticValue.toFixed(2)}
                            tabIndex={0}
                          />
                          {!isValid && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Auto: {automaticValue.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">% Avance Acumulado (Override Opcional)</h3>
                  <Badge variant="secondary" className="text-xs">Calculado automáticamente</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {monthRange.map(month => {
                    const isOverridden = hasOverride(month.value, 'avance_acumulado');
                    const value = formData[month.value]?.avance_acumulado || '0';
                    const automaticValue = automaticValues.avanceAcumulado[month.value] || 0;
                    const isValid = validatePercentage(value);
                    
                    return (
                      <div key={month.value} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {month.label}
                          </Label>
                          {isOverridden && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleResetField(month.value, 'avance_acumulado')}
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(e) => handleInputChange(month.value, 'avance_acumulado', e.target.value)}
                            className={`text-right ${!isValid ? 'border-destructive' : ''} ${isOverridden ? 'bg-amber-50 border-amber-300' : ''}`}
                            placeholder={automaticValue.toFixed(2)}
                            tabIndex={0}
                          />
                          {!isValid && (
                            <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-descriptive" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Auto: {automaticValue.toFixed(2)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}