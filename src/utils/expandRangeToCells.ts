/**
 * Utility for expanding Gantt activity ranges into individual cells
 */

export interface GanttCell {
  month: number;
  week: number;
}

/**
 * Expands a range from start to end month/week into individual cells
 * @param startMonth - Starting month (1-12)
 * @param startWeek - Starting week (1-4) 
 * @param endMonth - Ending month (1-12)
 * @param endWeek - Ending week (1-4)
 * @returns Array of cells that should be filled
 */
export function expandRangeToCells(
  startMonth: number,
  startWeek: number,
  endMonth: number,
  endWeek: number
): GanttCell[] {
  const cells: GanttCell[] = [];
  
  // Handle single month case
  if (startMonth === endMonth) {
    for (let week = startWeek; week <= endWeek; week++) {
      cells.push({ month: startMonth, week });
    }
    return cells;
  }
  
  // Handle multi-month case
  for (let month = startMonth; month <= endMonth; month++) {
    const weekStart = month === startMonth ? startWeek : 1;
    const weekEnd = month === endMonth ? endWeek : 4;
    
    for (let week = weekStart; week <= weekEnd; week++) {
      cells.push({ month, week });
    }
  }
  
  return cells;
}

/**
 * Converts absolute month number to grid position
 * @param absoluteMonth - Actual month number (1-12)
 * @param baseMonth - Starting month for the grid (1-12) 
 * @returns Grid position (1-based)
 */
export function monthToGridPosition(absoluteMonth: number, baseMonth: number): number {
  let position = absoluteMonth - baseMonth + 1;
  
  // Handle year wrapping
  if (position <= 0) {
    position += 12;
  }
  
  return position;
}

/**
 * Groups activities by mayor_id for rendering
 * @param activities - Array of Gantt activities
 * @param baseMonth - Starting month for the grid
 * @returns Map of mayor_id to expanded cells
 */
export function groupActivitiesByMayor(
  activities: Array<{
    id: string;
    mayor_id: string;
    start_month: number;
    start_week: number;
    end_month: number;
    end_week: number;
    duration_weeks: number;
  }>,
  baseMonth: number = 1
): Record<string, Array<{
  activity: any;
  cells: GanttCell[];
  gridCells: GanttCell[];
}>> {
  const grouped: Record<string, Array<{
    activity: any;
    cells: GanttCell[];
    gridCells: GanttCell[];
  }>> = {};

  activities.forEach(activity => {
    const cells = expandRangeToCells(
      activity.start_month,
      activity.start_week,
      activity.end_month,
      activity.end_week
    );

    // Convert to grid positions
    const gridCells = cells.map(cell => ({
      month: monthToGridPosition(cell.month, baseMonth),
      week: cell.week
    })).filter(cell => cell.month > 0 && cell.month <= 24); // Limit to reasonable grid size

    if (!grouped[activity.mayor_id]) {
      grouped[activity.mayor_id] = [];
    }

    grouped[activity.mayor_id].push({
      activity,
      cells,
      gridCells
    });
  });

  return grouped;
}

/**
 * Checks if a specific cell should be filled
 * @param month - Grid month position
 * @param week - Week number (1-4)
 * @param cells - Array of cells that should be filled
 * @returns true if cell should be filled
 */
export function isCellFilled(month: number, week: number, cells: GanttCell[]): boolean {
  return cells.some(cell => cell.month === month && cell.week === week);
}