import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Settings, RefreshCw } from 'lucide-react';
import { GanttPlan, GanttLine } from '@/hooks/gantt-v2/useGantt';
import { MatrixOverride } from '@/hooks/gantt-v2/useMatrixOverrides';
import { Mayor } from '@/hooks/gantt-v2/useMayoresTU';
import { generateMonthRange } from '@/utils/gantt-v2/monthRange';
import { GanttV2PDFExport } from './GanttV2PDFExport';
import { CompanyBrandingModal } from './CompanyBrandingModal';
import { ReferenceLineManager } from './ReferenceLineManager';

interface GanttToolbarProps {
  plan?: GanttPlan | null;
  lines: GanttLine[];
  mayores: Mayor[];
  overrides: MatrixOverride[];
  onUpdatePlan: (updates: Partial<GanttPlan>) => Promise<any>;
  onAddMayor: () => void;
  onAddDiscount: () => void;
  onSync: () => void;
  isLoading: boolean;
  isSyncing: boolean;
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
  onSync,
  isLoading,
  isSyncing,
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
    <Card className="gantt-container">
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-4">
          {/* Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Start Month Selector */}
            <div className="flex items-center gap-2 min-w-0">
              <Label htmlFor="start-month" className="text-xs sm:text-sm whitespace-nowrap shrink-0">Mes inicial:</Label>
              <Select 
                value={plan.start_month} 
                onValueChange={handleStartMonthChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full min-w-0">
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
            <div className="flex items-center gap-2 min-w-0">
              <Label htmlFor="months-count" className="text-xs sm:text-sm whitespace-nowrap shrink-0">Número de meses:</Label>
              <Input
                id="months-count"
                type="number"
                min={3}
                max={24}
                value={plan.months_count}
                onChange={(e) => handleMonthsCountChange(e.target.value)}
                className="w-20 shrink-0"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 items-center w-full">
            <Button 
              onClick={onAddMayor}
              disabled={isLoading || !canAddMayor}
              className="bg-primary hover:bg-primary/90 text-xs sm:text-sm whitespace-nowrap"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Añadir Mayor</span>
              <span className="sm:hidden">+ Mayor</span>
            </Button>
            
            <Button 
              onClick={onAddDiscount} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
              className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
            >
              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Añadir Descuento</span>
              <span className="sm:hidden">- Descuento</span>
            </Button>

            <Button 
              onClick={onSync}
              disabled={isLoading || isSyncing}
              variant="secondary"
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">Sincronizar desde Paramétrico</span>
              <span className="lg:hidden">Sincronizar</span>
            </Button>
            
            <Button 
              onClick={() => setShowBrandingModal(true)}
              variant="outline" 
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden lg:inline">Configurar Encabezado</span>
              <span className="lg:hidden">Config</span>
            </Button>
            
            {plan && lines.length > 0 && (
              <GanttV2PDFExport
                plan={plan}
                lines={lines}
                mayores={mayores}
                overrides={overrides}
                clientId={clientId}
                projectId={projectId}
              />
            )}
          </div>

          {/* Reference Lines Manager */}
          <div className="flex flex-col sm:flex-row gap-2">
            <ReferenceLineManager 
              planId={plan?.id}
              startMonth={plan?.start_month}
              monthsCount={plan?.months_count}
            />
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