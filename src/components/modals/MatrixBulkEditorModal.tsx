import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Undo, 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Loader2,
  RefreshCw,
  Download
} from 'lucide-react';
import { formatMonth, generateMonthRange } from '@/utils/cronogramaWeekUtils';

interface MatrixOverride {
  mes: string; // YYYY-MM
  concepto: string;
  valor: string;
  sobrescribe: boolean;
}

interface MatrixBulkEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  proyectoId: string;
  months: number;
  existingOverrides: Record<string, MatrixOverride>;
  calculations: {
    gastoPorMes: Record<string, number>;
    avanceParcial: Record<string, number>;
    avanceAcumulado: Record<string, number>;
    ministraciones: Record<string, number>;
    inversionAcumulada: Record<string, number>;
    fechasPago: Record<string, string[]>;
    totalPresupuesto: number;
  };
  onSaveOverrides: (overrides: MatrixOverride[]) => Promise<void>;
  onDeleteOverride: (mes: string, concepto: string) => Promise<void>;
}

export function MatrixBulkEditorModal({
  open,
  onOpenChange,
  clienteId,
  proyectoId,
  months,
  existingOverrides,
  calculations,
  onSaveOverrides,
  onDeleteOverride
}: MatrixBulkEditorModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Generate month range for editing
  const monthOptions = generateMonthRange(0, months);
  
  // Local state for form values
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});

  // Initialize form data with existing overrides or calculated values
  useEffect(() => {
    if (open) {
      const initialData: Record<string, Record<string, string>> = {};
      
      monthOptions.forEach(month => {
        initialData[month] = {
          gasto_obra: existingOverrides[`${month}-gasto_obra`]?.valor || calculations.gastoPorMes[month]?.toString() || '0',
          avance_parcial: existingOverrides[`${month}-avance_parcial`]?.valor || calculations.avanceParcial[month]?.toString() || '0',
          avance_acumulado: existingOverrides[`${month}-avance_acumulado`]?.valor || calculations.avanceAcumulado[month]?.toString() || '0',
          ministraciones: existingOverrides[`${month}-ministraciones`]?.valor || calculations.ministraciones[month]?.toString() || '0',
          inversion_acumulada: existingOverrides[`${month}-inversion_acumulada`]?.valor || calculations.inversionAcumulada[month]?.toString() || '0',
          fecha_pago: existingOverrides[`${month}-fecha_pago`]?.valor || (calculations.fechasPago[month] || []).join(', ') || '',
        };
      });
      
      setFormData(initialData);
    }
  }, [open, monthOptions, existingOverrides, calculations]);

  // Helper functions for auto-calculation
  const handleAutoDistributeFromGantt = () => {
    // Auto-distribute gasto_obra based on activity duration
    const totalGasto = calculations.totalPresupuesto;
    const totalWeeks = months * 4; // Assuming equal distribution
    
    const newData = { ...formData };
    monthOptions.forEach(month => {
      const monthlyAmount = totalGasto / months;
      newData[month] = {
        ...newData[month],
        gasto_obra: monthlyAmount.toString()
      };
    });
    
    setFormData(newData);
    
    toast({
      title: "Distribución automática aplicada",
      description: "Los gastos se han distribuido uniformemente basado en el cronograma."
    });
  };

  const handleCalculateAdvanceFromSpend = () => {
    // Calculate advance percentages based on spending
    const totalBudget = calculations.totalPresupuesto;
    let accumulatedSpend = 0;
    
    const newData = { ...formData };
    monthOptions.forEach(month => {
      const monthlySpend = parseFloat(newData[month].gasto_obra) || 0;
      accumulatedSpend += monthlySpend;
      
      const monthlyAdvance = totalBudget > 0 ? (monthlySpend / totalBudget) * 100 : 0;
      const accumulatedAdvance = totalBudget > 0 ? (accumulatedSpend / totalBudget) * 100 : 0;
      
      newData[month] = {
        ...newData[month],
        avance_parcial: monthlyAdvance.toFixed(2),
        avance_acumulado: accumulatedAdvance.toFixed(2)
      };
    });
    
    setFormData(newData);
    
    toast({
      title: "Avances calculados",
      description: "Los porcentajes de avance se han calculado automáticamente."
    });
  };

  const handleImportFromPaymentPlans = async () => {
    // TODO: Import from payment plans (integrate with existing payment plans data)
    toast({
      title: "Funcionalidad en desarrollo",
      description: "La importación desde planes de pago estará disponible próximamente."
    });
  };

  // Handle input changes
  const handleInputChange = (month: string, concepto: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [month]: {
        ...prev[month],
        [concepto]: value
      }
    }));
  };

  // Handle reset for specific month
  const handleResetMonth = async (month: string) => {
    // Delete all overrides for this month
    const conceptos = ['gasto_obra', 'avance_parcial', 'avance_acumulado', 'ministraciones', 'inversion_acumulada', 'fecha_pago'];
    
    try {
      await Promise.all(
        conceptos.map(concepto => onDeleteOverride(month, concepto))
      );
      
      // Reset form data to calculated values
      setFormData(prev => ({
        ...prev,
        [month]: {
          gasto_obra: calculations.gastoPorMes[month]?.toString() || '0',
          avance_parcial: calculations.avanceParcial[month]?.toString() || '0',
          avance_acumulado: calculations.avanceAcumulado[month]?.toString() || '0',
          ministraciones: calculations.ministraciones[month]?.toString() || '0',
          inversion_acumulada: calculations.inversionAcumulada[month]?.toString() || '0',
          fecha_pago: (calculations.fechasPago[month] || []).join(', ') || '',
        }
      }));
      
      toast({
        title: "Mes restablecido",
        description: `Los valores de ${formatMonth(month)} han sido restablecidos a los valores automáticos.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo restablecer el mes.",
        variant: "destructive"
      });
    }
  };

  // Handle reset all
  const handleResetAll = () => {
    const initialData: Record<string, Record<string, string>> = {};
    
    monthOptions.forEach(month => {
      initialData[month] = {
        gasto_obra: calculations.gastoPorMes[month]?.toString() || '0',
        avance_parcial: calculations.avanceParcial[month]?.toString() || '0',
        avance_acumulado: calculations.avanceAcumulado[month]?.toString() || '0',
        ministraciones: calculations.ministraciones[month]?.toString() || '0',
        inversion_acumulada: calculations.inversionAcumulada[month]?.toString() || '0',
        fecha_pago: (calculations.fechasPago[month] || []).join(', ') || '',
      };
    });
    
    setFormData(initialData);
    
    toast({
      title: "Formulario restablecido",
      description: "Todos los valores han sido restablecidos a los valores automáticos."
    });
  };

  // Handle save
  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const overridesToSave: MatrixOverride[] = [];
      
      // Compare current form data with original calculated values
      monthOptions.forEach(month => {
        const monthData = formData[month];
        if (!monthData) return;
        
        Object.entries(monthData).forEach(([concepto, valor]) => {
          // Determine if this is an override by comparing with calculated values
          let isOverride = false;
          let originalValue = '';
          
          switch (concepto) {
            case 'gasto_obra':
              originalValue = calculations.gastoPorMes[month]?.toString() || '0';
              break;
            case 'avance_parcial':
              originalValue = calculations.avanceParcial[month]?.toString() || '0';
              break;
            case 'avance_acumulado':
              originalValue = calculations.avanceAcumulado[month]?.toString() || '0';
              break;
            case 'ministraciones':
              originalValue = calculations.ministraciones[month]?.toString() || '0';
              break;
            case 'inversion_acumulada':
              originalValue = calculations.inversionAcumulada[month]?.toString() || '0';
              break;
            case 'fecha_pago':
              originalValue = (calculations.fechasPago[month] || []).join(', ') || '';
              break;
          }
          
          isOverride = valor !== originalValue;
          
          if (isOverride && valor.trim() !== '') {
            overridesToSave.push({
              mes: month,
              concepto,
              valor: valor.trim(),
              sobrescribe: true
            });
          }
        });
      });
      
      await onSaveOverrides(overridesToSave);
      
      toast({
        title: "Matriz guardada",
        description: `Se han guardado ${overridesToSave.length} valores personalizados.`
      });
      
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la matriz.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency for display
  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Editor Masivo de Matriz Mensual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDistributeFromGantt}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Autodistribuir por Gantt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalculateAdvanceFromSpend}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Calcular Avances
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportFromPaymentPlans}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Importar Planes de Pago
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="flex items-center gap-2 ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Restablecer Todo
            </Button>
          </div>

          {/* Main Editor */}
          <Tabs defaultValue="gasto_obra" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="gasto_obra">Gasto Obra</TabsTrigger>
              <TabsTrigger value="avance_parcial">% Avance Parcial</TabsTrigger>
              <TabsTrigger value="avance_acumulado">% Avance Acum.</TabsTrigger>
              <TabsTrigger value="ministraciones">Ministraciones</TabsTrigger>
              <TabsTrigger value="inversion_acumulada">% Inversión Acum.</TabsTrigger>
              <TabsTrigger value="fecha_pago">Fechas Pago</TabsTrigger>
            </TabsList>

            {/* Gasto en Obra */}
            <TabsContent value="gasto_obra" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">Gasto en Obra (MXN)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthOptions.map(month => (
                  <div key={month} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formatMonth(month)}
                    </Label>
                    <Input
                      type="number"
                      value={formData[month]?.gasto_obra || '0'}
                      onChange={(e) => handleInputChange(month, 'gasto_obra', e.target.value)}
                      className="text-right"
                      placeholder="0"
                    />
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(formData[month]?.gasto_obra || '0')}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Avance Parcial */}
            <TabsContent value="avance_parcial" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">% Avance Parcial</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthOptions.map(month => (
                  <div key={month} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formatMonth(month)}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData[month]?.avance_parcial || '0'}
                      onChange={(e) => handleInputChange(month, 'avance_parcial', e.target.value)}
                      className="text-right"
                      placeholder="0.00"
                    />
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(formData[month]?.avance_parcial || '0').toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Avance Acumulado */}
            <TabsContent value="avance_acumulado" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">% Avance Acumulado</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthOptions.map(month => (
                  <div key={month} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formatMonth(month)}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData[month]?.avance_acumulado || '0'}
                      onChange={(e) => handleInputChange(month, 'avance_acumulado', e.target.value)}
                      className="text-right"
                      placeholder="0.00"
                    />
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(formData[month]?.avance_acumulado || '0').toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Ministraciones */}
            <TabsContent value="ministraciones" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Ministraciones (MXN)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthOptions.map(month => (
                  <div key={month} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formatMonth(month)}
                    </Label>
                    <Input
                      type="number"
                      value={formData[month]?.ministraciones || '0'}
                      onChange={(e) => handleInputChange(month, 'ministraciones', e.target.value)}
                      className="text-right"
                      placeholder="0"
                    />
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(formData[month]?.ministraciones || '0')}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Inversión Acumulada */}
            <TabsContent value="inversion_acumulada" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold">% Inversión Acumulada</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthOptions.map(month => (
                  <div key={month} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formatMonth(month)}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData[month]?.inversion_acumulada || '0'}
                      onChange={(e) => handleInputChange(month, 'inversion_acumulada', e.target.value)}
                      className="text-right"
                      placeholder="0.00"
                    />
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(formData[month]?.inversion_acumulada || '0').toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Fechas de Pago */}
            <TabsContent value="fecha_pago" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Fechas Tentativas de Pago</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {monthOptions.map(month => (
                  <div key={month} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {formatMonth(month)}
                    </Label>
                    <Textarea
                      value={formData[month]?.fecha_pago || ''}
                      onChange={(e) => handleInputChange(month, 'fecha_pago', e.target.value)}
                      className="min-h-[60px]"
                      placeholder="Fechas de pago (separar con comas)"
                    />
                  </div>
                ))}
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