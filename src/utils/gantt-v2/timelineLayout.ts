export interface TimelineLayout {
  months: Array<{
    id: string;
    left: number;     // px relative to scrollable container
    width: number;    // px
    weekWidth: number; // px (width/4)
  }>;
  top: number;        // px top of grid
  height: number;     // px height of grid
  totalWidth: number; // px total width of timeline
}

/**
 * Calculate timeline layout based on actual DOM measurements
 * This ensures positioning is accurate regardless of screen size or zoom
 */
export function getTimelineLayout(monthRange: Array<{ value: string; label: string }>): TimelineLayout {
  // Try to get actual measurements from DOM
  const ganttTable = document.querySelector('.gantt-table') as HTMLElement;
  const monthHeaders = document.querySelectorAll('.gantt-month-col') as NodeListOf<HTMLElement>;
  const tableBody = document.querySelector('.gantt-table tbody') as HTMLElement;
  
  // Fallback to calculated values if DOM not available
  const fallbackMonthWidth = 120; // Should match CSS gantt-month-col width
  const fallbackFreezeWidth = 64 + 50 + 200 + 120 + 80; // actions + no + mayor + importe + %
  
  let months: TimelineLayout['months'] = [];
  let totalWidth = fallbackFreezeWidth;
  
  if (monthHeaders && monthHeaders.length > 0) {
    // Use actual DOM measurements
    const firstMonthRect = monthHeaders[0].getBoundingClientRect();
    const tableRect = ganttTable?.getBoundingClientRect();
    
    monthHeaders.forEach((header, index) => {
      const rect = header.getBoundingClientRect();
      const left = tableRect ? rect.left - tableRect.left : fallbackFreezeWidth + (index * fallbackMonthWidth);
      const width = rect.width || fallbackMonthWidth;
      
      months.push({
        id: monthRange[index]?.value || `month-${index}`,
        left,
        width,
        weekWidth: width / 4
      });
    });
    
    totalWidth = tableRect?.width || (fallbackFreezeWidth + monthRange.length * fallbackMonthWidth);
  } else {
    // Fallback to calculated positions
    months = monthRange.map((month, index) => ({
      id: month.value,
      left: fallbackFreezeWidth + (index * fallbackMonthWidth),
      width: fallbackMonthWidth,
      weekWidth: fallbackMonthWidth / 4
    }));
    
    totalWidth = fallbackFreezeWidth + monthRange.length * fallbackMonthWidth;
  }
  
  // Calculate grid dimensions
  const top = ganttTable?.querySelector('thead')?.getBoundingClientRect().height || 60;
  const height = tableBody?.getBoundingClientRect().height || 400;
  
  return {
    months,
    top,
    height,
    totalWidth
  };
}

/**
 * Calculate X position for a specific month and week
 * @param layout Timeline layout data
 * @param monthId Month identifier (e.g., "202511")
 * @param weekNumber Week number (1-4, 1-based)
 * @returns X position in pixels
 */
export function xForMonthWeek(layout: TimelineLayout, monthId: string, weekNumber: 1 | 2 | 3 | 4): number {
  const month = layout.months.find(m => m.id === monthId);
  if (!month) {
    console.warn(`Month ${monthId} not found in layout`);
    return 0;
  }
  
  // Position at the END of the selected week
  const x = month.left + (weekNumber * month.weekWidth);
  
  // Align to pixel boundary for crisp rendering
  return Math.round(x) + 0.5;
}