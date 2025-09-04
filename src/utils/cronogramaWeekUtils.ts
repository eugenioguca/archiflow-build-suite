/**
 * Utility functions for Cronograma Gantt week-based calculations
 */

export interface MonthWeek {
  month: number;
  week: number;
}

export interface MonthWeekRange {
  start: MonthWeek;
  end: MonthWeek;
}

/**
 * Calculate the number of weeks between two month+week positions (inclusive)
 */
export function weeksBetween(start: MonthWeek, end: MonthWeek): number {
  const startPosition = (start.month - 1) * 4 + start.week;
  const endPosition = (end.month - 1) * 4 + end.week;
  return Math.max(1, endPosition - startPosition + 1);
}

/**
 * Expand a range into individual month+week cells
 */
export function expandRangeToMonthWeekCells(start: MonthWeek, end: MonthWeek): MonthWeek[] {
  const cells: MonthWeek[] = [];
  
  for (let month = start.month; month <= end.month; month++) {
    const startWeek = month === start.month ? start.week : 1;
    const endWeek = month === end.month ? end.week : 4;
    
    for (let week = startWeek; week <= endWeek; week++) {
      cells.push({ month, week });
    }
  }
  
  return cells;
}

/**
 * Convert activities with month+week ranges to a map structure
 */
export function toMonthlyWeekMap(activities: Array<{
  id: string;
  mayor_id: string;
  start_month: number;
  start_week: number;
  end_month: number;
  end_week: number;
}>): Record<string, MonthWeek[]> {
  const map: Record<string, MonthWeek[]> = {};
  
  activities.forEach(activity => {
    const cells = expandRangeToMonthWeekCells(
      { month: activity.start_month, week: activity.start_week },
      { month: activity.end_month, week: activity.end_week }
    );
    
    const key = `${activity.mayor_id}`;
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(...cells);
  });
  
  return map;
}

/**
 * Validate month+week range
 */
export function validateMonthWeekRange(start: MonthWeek, end: MonthWeek): {
  isValid: boolean;
  error?: string;
} {
  if (start.week < 1 || start.week > 4) {
    return { isValid: false, error: 'Semana de inicio debe estar entre 1 y 4' };
  }
  
  if (end.week < 1 || end.week > 4) {
    return { isValid: false, error: 'Semana de fin debe estar entre 1 y 4' };
  }
  
  if (start.month < 1) {
    return { isValid: false, error: 'Mes de inicio debe ser mayor a 0' };
  }
  
  if (end.month < 1) {
    return { isValid: false, error: 'Mes de fin debe ser mayor a 0' };
  }
  
  const startPosition = (start.month - 1) * 4 + start.week;
  const endPosition = (end.month - 1) * 4 + end.week;
  
  if (startPosition > endPosition) {
    return { isValid: false, error: 'La fecha de fin debe ser posterior o igual a la fecha de inicio' };
  }
  
  return { isValid: true };
}

/**
 * Format month number to month name
 */
export function formatMonth(monthNumber: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthNumber - 1);
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

/**
 * Get current month number (1-based)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}