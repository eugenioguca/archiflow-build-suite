/**
 * Modern Cronograma Gantt utilities with YYYY-MM month handling
 */

export interface MonthWeek {
  month: string; // YYYYMM format (202508)
  week: number; // 1-4
}

export interface MonthWeekRange {
  start: MonthWeek;
  end: MonthWeek;
}

export interface GanttCell {
  month: string; // YYYYMM format (202508)
  week: number; // 1-4
}

/**
 * Calculate the number of weeks between two YYYYMM month+week positions (inclusive)
 */
export function weeksBetween(start: MonthWeek, end: MonthWeek): number {
  // Parse YYYYMM format directly
  const startYear = parseInt(start.month.substring(0, 4));
  const startMonth = parseInt(start.month.substring(4, 6)) - 1; // JS months are 0-based
  const endYear = parseInt(end.month.substring(0, 4));
  const endMonth = parseInt(end.month.substring(4, 6)) - 1; // JS months are 0-based
  
  const startPosition = (startYear * 12 + startMonth) * 4 + start.week;
  const endPosition = (endYear * 12 + endMonth) * 4 + end.week;
  
  return Math.max(1, endPosition - startPosition + 1);
}

/**
 * Calculate precise date from YYYYMM month and week number (1-4)
 * Week 1 = day 1-7, Week 2 = day 8-14, Week 3 = day 15-21, Week 4 = day 22-end of month
 */
export function calculateDateFromMonthWeek(monthStr: string, week: number): string {
  // Parse YYYYMM format (202508)
  const year = parseInt(monthStr.substring(0, 4));
  const month = parseInt(monthStr.substring(4, 6));
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
 * Expand a YYYYMM range into individual month+week cells (simplified, no Date objects)
 */
// Devuelve todas las celdas {month, week} que cubre una actividad
export function expandRangeToMonthWeekCells(
  startMonth: string,  // ej: "202509"
  startWeek: number,   // ej: 1
  endMonth: string,    // ej: "202510"
  endWeek: number      // ej: 3
): { month: string; week: number }[] {
  const result: { month: string; week: number }[] = [];
  let current = parseInt(startMonth, 10);
  const end = parseInt(endMonth, 10);

  while (true) {
    const isStart = current === parseInt(startMonth, 10);
    const isEnd   = current === end;

    const minW = isStart ? startWeek : 1;
    const maxW = isEnd   ? endWeek   : 4;

    for (let w = minW; w <= maxW; w++) {
      result.push({ month: String(current), week: w });
    }

    if (isEnd) break;

    // incrementar mes YYYYMM
    let y = Math.floor(current / 100);
    let m = current % 100;
    m++;
    if (m > 12) { m = 1; y++; }
    current = y * 100 + m;
  }

  return result;
}

/**
 * Helper functions for YYYYMM arithmetic (no dates)
 */
export const incrementYYYYMM = (val: string): string => {
  let n = parseInt(val, 10), y = Math.floor(n/100), m = n%100;
  m++; if (m>12){m=1;y++}
  return String(y*100 + m);
};

export const formatYYYYMMToLabel = (val: string, locale='es-MX'): string => {
  const y = parseInt(val.slice(0,4),10);
  const m = parseInt(val.slice(4,6),10);
  return new Date(y, m-1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

/**
 * Convert activities with YYYYMM ranges to a map structure
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
      activity.start_month,
      activity.start_week,
      activity.end_month,
      activity.end_week
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
 * Validate YYYYMM month+week range
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
  
  if (!start.month.match(/^\d{6}$/)) {
    return { isValid: false, error: 'Formato de mes de inicio inválido (usar YYYYMM)' };
  }
  
  if (!end.month.match(/^\d{6}$/)) {
    return { isValid: false, error: 'Formato de mes de fin inválido (usar YYYYMM)' };
  }
  
  const startNum = parseInt(start.month);
  const endNum = parseInt(end.month);
  
  if (startNum > endNum) {
    return { isValid: false, error: 'La fecha de fin debe ser posterior o igual a la fecha de inicio' };
  }
  
  return { isValid: true };
}

/**
 * Format YYYYMM month to display name
 */
export function formatMonth(monthStr: string): string {
  // Convert "202508" to Date object
  const year = parseInt(monthStr.substring(0, 4));
  const month = parseInt(monthStr.substring(4, 6)) - 1; // JS months are 0-based
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

/**
 * Format YYYYMM month to short display name
 */
export function formatMonthShort(monthStr: string): string {
  // Convert "202508" to Date object
  const year = parseInt(monthStr.substring(0, 4));
  const month = parseInt(monthStr.substring(4, 6)) - 1; // JS months are 0-based
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('es-MX', { month: 'short' });
}

/**
 * Get current month in YYYYMM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return formatDateToYYYYMM(now);
}

/**
 * Format Date to YYYYMM string
 */
export function formatDateToYYYYMM(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;  // Return YYYYMM format (202508)
}

/**
 * Generate month range for Gantt display in YYYYMM format
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
 * Generate month options for form dropdowns with value and label
 */
export function generateMonthOptions(startOffset: number = 0, count: number = 12): Array<{ value: string; label: string }> {
  const months: Array<{ value: string; label: string }> = [];
  const current = new Date();
  current.setMonth(current.getMonth() + startOffset);
  
  for (let i = 0; i < count; i++) {
    const yyyymm = formatDateToYYYYMM(current);
    months.push({
      value: yyyymm,
      label: formatYYYYMMToLabel(yyyymm)
    });
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
      activity.start_month,
      activity.start_week,
      activity.end_month,
      activity.end_week
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