import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Settings } from 'lucide-react';
import { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { GanttV2PDFExport } from './GanttV2PDFExport';
import { CompanyBrandingModal } from './CompanyBrandingModal';

interface GanttToolbarProps {
  plan?: GanttPlan | null;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  onUpdatePlan: (updates: Partial<GanttPlan>) => Promise<any>;
  onAddMayor: () => void;
  onAddDiscount: () => void;
  isLoading: boolean;
  canAddMayor: boolean;
  clientId: string;
  projectId: string;
}

export function GanttToolbar({
  plan,
  lines,
  mayores,
  overrides,
  onUpdatePlan,
  onAddMayor,
  onAddDiscount,
  isLoading,
  canAddMayor,
  clientId,
  projectId
}: GanttToolbarProps) {
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  if (!plan) return null;

  const handleStartMonthChange = (value: string) => {
    onUpdatePlan({ start_month: value });
  };

  const handleMonthsCountChange = (value: string) => {
    const count = parseInt(value);
    if (count >= 3 && count <= 24) {
      onUpdatePlan({ months_count: count });
    }
  };

  // Generate month options (current month ± 12 months)
  const currentMonth = new Date();
  currentMonth.setMonth(currentMonth.getMonth() - 12);
  const monthOptions = generateMonthRange(
    `${currentMonth.getFullYear()}${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
    25
  );

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
          {/* Configuration Controls */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Start Month Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label htmlFor="start-month" className="text-sm font-medium whitespace-nowrap">
                Mes inicial:
              </Label>
              <Select 
                value={plan.start_month} 
                onValueChange={handleStartMonthChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Months Count Input */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label htmlFor="months-count" className="text-sm font-medium whitespace-nowrap">
                Meses:
              </Label>
              <Input
                id="months-count"
                type="number"
                min={3}
                max={24}
                value={plan.months_count}
                onChange={(e) => handleMonthsCountChange(e.target.value)}
                className="w-full sm:w-20"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <Button 
              onClick={onAddMayor}
              disabled={isLoading || !canAddMayor}
              className="bg-primary hover:bg-primary/90 touch-manipulation flex-1 sm:flex-none"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Añadir Mayor</span>
              <span className="sm:hidden">Mayor</span>
            </Button>
            
            <Button 
              onClick={onAddDiscount} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
              className="gap-2 touch-manipulation flex-1 sm:flex-none"
            >
              <Minus className="h-4 w-4" />
              <span className="hidden sm:inline">Añadir Descuento</span>
              <span className="sm:hidden">Descuento</span>
            </Button>
            
            <Button 
              onClick={() => setShowBrandingModal(true)}
              variant="outline" 
              size="sm"
              className="gap-2 touch-manipulation flex-1 sm:flex-none"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Configurar Encabezado</span>
              <span className="md:hidden">Config.</span>
            </Button>
            
            {plan && lines.length > 0 && (
              <div className="flex-1 sm:flex-none">
                <GanttV2PDFExport
                  plan={plan}
                  lines={lines}
                  mayores={mayores}
                  overrides={overrides}
                  clientId={clientId}
                  projectId={projectId}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Company Branding Modal */}
      <CompanyBrandingModal 
        open={showBrandingModal}
        onOpenChange={setShowBrandingModal}
        clientId={clientId}
        projectId={projectId}
      />
    </Card>
  );
}