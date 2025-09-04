import { ModernGanttActivity, MonthlyCalculations, MatrixOverride } from '@/hooks/useModernCronograma';
import { generateMonthRange, formatDateToYYYYMM } from '@/utils/cronogramaWeekUtils';

/**
 * Independent Gantt calculations helper - no external system dependencies
 */

export interface GanttCalculationParams {
  activities: ModernGanttActivity[];
  overrides: MatrixOverride[];
  parametricoTotals: { totalsByMayor: Record<string, number>; totalGeneral: number };
  months: number;
}

/**
 * Calculate monthly expenses based on Gantt activities and parametric budget
 */
export function calculateMonthlyExpenses(
  activities: ModernGanttActivity[],
  parametricoTotals: { totalsByMayor: Record<string, number>; totalGeneral: number },
  months: number
): Record<string, number> {
  const monthRange = generateMonthRange(0, months);
  const gastoPorMes: Record<string, number> = {};
  
  // Initialize all months to 0
  monthRange.forEach(month => {
    gastoPorMes[month] = 0;
  });

  // Group activities by mayor_id
  const activitiesByMayor: Record<string, ModernGanttActivity[]> = {};
  activities.forEach(activity => {
    if (!activitiesByMayor[activity.mayor_id]) {
      activitiesByMayor[activity.mayor_id] = [];
    }
    activitiesByMayor[activity.mayor_id].push(activity);
  });

  // Distribute mayor budgets across their active months
  Object.entries(activitiesByMayor).forEach(([mayorId, mayorActivities]) => {
    const mayorBudget = parametricoTotals.totalsByMayor[mayorId] || 0;
    
    if (mayorBudget <= 0 || mayorActivities.length === 0) return;

    // Get all active months for this mayor
    const activeMonths = new Set<string>();
    mayorActivities.forEach(activity => {
      const startYear = parseInt(activity.start_month.split('-')[0]);
      const startMonth = parseInt(activity.start_month.split('-')[1]);
      const endYear = parseInt(activity.end_month.split('-')[0]);
      const endMonth = parseInt(activity.end_month.split('-')[1]);

      // Add all months in the activity range
      let currentYear = startYear;
      let currentMonth = startMonth;
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        const monthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        if (monthRange.includes(monthStr)) {
          activeMonths.add(monthStr);
        }
        
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    });

    // Distribute budget equally across active months
    const monthlyAmount = activeMonths.size > 0 ? mayorBudget / activeMonths.size : 0;
    activeMonths.forEach(month => {
      gastoPorMes[month] += monthlyAmount;
    });
  });

  return gastoPorMes;
}

/**
 * Calculate progress percentages based on expenses
 */
export function calculateProgressPercentages(
  gastoPorMes: Record<string, number>,
  totalBudget: number,
  months: number
): { avanceParcial: Record<string, number>; avanceAcumulado: Record<string, number> } {
  const monthRange = generateMonthRange(0, months);
  const avanceParcial: Record<string, number> = {};
  const avanceAcumulado: Record<string, number> = {};
  
  let accumulatedExpense = 0;

  monthRange.forEach(month => {
    const monthlyExpense = gastoPorMes[month] || 0;
    
    // Partial progress (monthly)
    avanceParcial[month] = totalBudget > 0 ? (monthlyExpense / totalBudget) * 100 : 0;
    
    // Accumulated progress
    accumulatedExpense += monthlyExpense;
    avanceAcumulado[month] = totalBudget > 0 ? (accumulatedExpense / totalBudget) * 100 : 0;
  });

  return { avanceParcial, avanceAcumulado };
}

/**
 * Generate basic ministraciones (independent of payment plans)
 */
export function calculateBasicMinistraciones(
  totalBudget: number,
  months: number
): Record<string, number> {
  const monthRange = generateMonthRange(0, months);
  const ministraciones: Record<string, number> = {};
  
  // Basic equal distribution as starting point
  const monthlyAmount = totalBudget / months;
  
  monthRange.forEach(month => {
    ministraciones[month] = monthlyAmount;
  });

  return ministraciones;
}

/**
 * Calculate investment percentages based on ministraciones
 */
export function calculateInvestmentAccumulated(
  ministraciones: Record<string, number>,
  totalBudget: number,
  months: number
): Record<string, number> {
  const monthRange = generateMonthRange(0, months);
  const inversionAcumulada: Record<string, number> = {};
  
  let accumulatedInvestment = 0;

  monthRange.forEach(month => {
    accumulatedInvestment += ministraciones[month] || 0;
    inversionAcumulada[month] = totalBudget > 0 ? (accumulatedInvestment / totalBudget) * 100 : 0;
  });

  return inversionAcumulada;
}

/**
 * Apply manual overrides to calculated values
 */
export function applyManualOverrides(
  calculations: MonthlyCalculations,
  overrides: MatrixOverride[]
): MonthlyCalculations {
  const result = { ...calculations };
  
  // Create override lookup
  const overrideLookup: Record<string, string> = {};
  overrides.forEach(override => {
    const key = `${override.mes}-${override.concepto}`;
    overrideLookup[key] = override.valor;
  });

  // Apply overrides to all calculation types
  Object.keys(result.gastoPorMes).forEach(month => {
    const gastoKey = `${month}-gasto_obra`;
    const avanceParcialKey = `${month}-avance_parcial`;
    const avanceAcumuladoKey = `${month}-avance_acumulado`;
    const ministracionesKey = `${month}-ministraciones`;
    const inversionKey = `${month}-inversion_acumulada`;

    if (overrideLookup[gastoKey]) {
      result.gastoPorMes[month] = parseFloat(overrideLookup[gastoKey]) || 0;
    }
    if (overrideLookup[avanceParcialKey]) {
      result.avanceParcial[month] = parseFloat(overrideLookup[avanceParcialKey]) || 0;
    }
    if (overrideLookup[avanceAcumuladoKey]) {
      result.avanceAcumulado[month] = parseFloat(overrideLookup[avanceAcumuladoKey]) || 0;
    }
    if (overrideLookup[ministracionesKey]) {
      result.ministraciones[month] = parseFloat(overrideLookup[ministracionesKey]) || 0;
    }
    if (overrideLookup[inversionKey]) {
      result.inversionAcumulada[month] = parseFloat(overrideLookup[inversionKey]) || 0;
    }
  });

  return result;
}

/**
 * Main calculation engine - combines all calculations
 */
export function calculateGanttMatrix({
  activities,
  overrides,
  parametricoTotals,
  months
}: GanttCalculationParams): MonthlyCalculations {
  
  // Step 1: Calculate basic monthly expenses from activities and parametric budget
  const gastoPorMes = calculateMonthlyExpenses(activities, parametricoTotals, months);
  
  // Step 2: Calculate progress percentages
  const { avanceParcial, avanceAcumulado } = calculateProgressPercentages(
    gastoPorMes,
    parametricoTotals.totalGeneral,
    months
  );
  
  // Step 3: Generate basic ministraciones (independent)
  const ministraciones = calculateBasicMinistraciones(parametricoTotals.totalGeneral, months);
  
  // Step 4: Calculate investment percentages
  const inversionAcumulada = calculateInvestmentAccumulated(
    ministraciones,
    parametricoTotals.totalGeneral,
    months
  );
  
  // Step 5: Initialize empty payment dates (fully manual)
  const monthRange = generateMonthRange(0, months);
  const fechasPago: Record<string, string[]> = {};
  monthRange.forEach(month => {
    fechasPago[month] = [];
  });

  // Step 6: Create base calculations
  const baseCalculations: MonthlyCalculations = {
    gastoPorMes,
    avanceParcial,
    avanceAcumulado,
    ministraciones,
    inversionAcumulada,
    fechasPago,
    totalPresupuesto: parametricoTotals.totalGeneral
  };

  // Step 7: Apply manual overrides
  return applyManualOverrides(baseCalculations, overrides);
}