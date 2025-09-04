/**
 * Modern Cronograma Gantt utilities with YYYY-MM month handling
 */

export interface MonthWeek {
  month: string; // YYYY-MM format
  week: number; // 1-4
}

export interface MonthWeekRange {
  start: MonthWeek;
  end: MonthWeek;
}

export interface GanttCell {
  month: string; // YYYY-MM format
  week: number; // 1-4
}

/**
 * Calculate the number of weeks between two YYYY-MM month+week positions (inclusive)
 */
export function weeksBetween(start: MonthWeek, end: MonthWeek): number {
  const startDate = new Date(start.month);
  const endDate = new Date(end.month);
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();
  
  const startPosition = (startYear * 12 + startMonth) * 4 + start.week;
  const endPosition = (endYear * 12 + endMonth) * 4 + end.week;
  
  return Math.max(1, endPosition - startPosition + 1);
}

/**
 * Expand a YYYY-MM range into individual month+week cells
 */
export function expandRangeToMonthWeekCells(start: MonthWeek, end: MonthWeek): GanttCell[] {
  const cells: GanttCell[] = [];
  const startDate = new Date(start.month);
  const endDate = new Date(end.month);
  
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const monthStr = formatDateToYYYYMM(current);
    const isStartMonth = monthStr === start.month;
    const isEndMonth = monthStr === end.month;
    
    const startWeek = isStartMonth ? start.week : 1;
    const endWeek = isEndMonth ? end.week : 4;
    
    for (let week = startWeek; week <= endWeek; week++) {
      cells.push({ month: monthStr, week });
    }
    
    current.setMonth(current.getMonth() + 1);
  }
  
  return cells;
}

/**
 * Convert activities with YYYY-MM ranges to a map structure
 */
export function toMonthlyWeekMap(activities: Array<{
  id: string;
  mayor_id: string;
  start_month: string;
  start_week: number;
  end_month: string;
  end_week: number;
}>): Record<string, GanttCell[]> {
  const map: Record<string, GanttCell[]> = {};
  
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
 * Validate YYYY-MM month+week range
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
  
  if (!start.month.match(/^\d{4}-\d{2}$/)) {
    return { isValid: false, error: 'Formato de mes de inicio inválido (usar YYYY-MM)' };
  }
  
  if (!end.month.match(/^\d{4}-\d{2}$/)) {
    return { isValid: false, error: 'Formato de mes de fin inválido (usar YYYY-MM)' };
  }
  
  const startDate = new Date(start.month);
  const endDate = new Date(end.month);
  
  if (startDate > endDate) {
    return { isValid: false, error: 'La fecha de fin debe ser posterior o igual a la fecha de inicio' };
  }
  
  return { isValid: true };
}

/**
 * Format YYYY-MM month to display name
 */
export function formatMonth(monthStr: string): string {
  const date = new Date(monthStr);
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

/**
 * Format YYYY-MM month to short display name
 */
export function formatMonthShort(monthStr: string): string {
  const date = new Date(monthStr);
  return date.toLocaleDateString('es-MX', { month: 'short' });
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return formatDateToYYYYMM(now);
}

/**
 * Format Date to YYYY-MM string
 */
export function formatDateToYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calculate precise date from YYYY-MM month and week number (1-4)
 * Week 1 = day 1-7, Week 2 = day 8-14, Week 3 = day 15-21, Week 4 = day 22-end of month
 */
export function calculateDateFromMonthWeek(monthStr: string, week: number): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1); // First day of the month
  
  // Calculate the starting day for the given week
  let targetDay: number;
  switch (week) {
    case 1:
      targetDay = 1;
      break;
    case 2:
      targetDay = 8;
      break;
    case 3:
      targetDay = 15;
      break;
    case 4:
      targetDay = 22;
      break;
    default:
      targetDay = 1;
  }
  
  // Set the day and ensure it doesn't exceed the month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const finalDay = Math.min(targetDay, lastDayOfMonth);
  date.setDate(finalDay);
  
  // Return in YYYY-MM-DD format
  return date.toISOString().split('T')[0];
}

/**
 * Generate month range for Gantt display
 */
export function generateMonthRange(startOffset: number = 0, count: number = 12): string[] {
  const months: string[] = [];
  const current = new Date();
  current.setMonth(current.getMonth() + startOffset);
  
  for (let i = 0; i < count; i++) {
    months.push(formatDateToYYYYMM(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Check if a cell should be filled based on activities
 */
export function isCellFilled(
  targetMonth: string, 
  targetWeek: number, 
  cells: GanttCell[]
): boolean {
  return cells.some(cell => cell.month === targetMonth && cell.week === targetWeek);
}

/**
 * Group activities by mayor for rendering
 */
export function groupActivitiesByMayor(
  activities: Array<{
    id: string;
    mayor_id: string;
    start_month: string;
    start_week: number;
    end_month: string;
    end_week: number;
    duration_weeks: number;
  }>
): Record<string, Array<{
  activity: any;
  cells: GanttCell[];
}>> {
  const grouped: Record<string, Array<{
    activity: any;
    cells: GanttCell[];
  }>> = {};

  activities.forEach(activity => {
    const cells = expandRangeToMonthWeekCells(
      { month: activity.start_month, week: activity.start_week },
      { month: activity.end_month, week: activity.end_week }
    );

    if (!grouped[activity.mayor_id]) {
      grouped[activity.mayor_id] = [];
    }

    grouped[activity.mayor_id].push({
      activity,
      cells
    });
  });

  return grouped;
}