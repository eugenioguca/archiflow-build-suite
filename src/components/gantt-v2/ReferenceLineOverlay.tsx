import React from 'react';
import { ReferenceLine } from '@/hooks/gantt-v2/useReferenceLines';

interface ReferenceLineOverlayProps {
  referenceLines: ReferenceLine[];
  monthRange: Array<{ value: string; label: string }>;
}

export function ReferenceLineOverlay({ referenceLines, monthRange }: ReferenceLineOverlayProps) {
  if (referenceLines.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {referenceLines.map((line) => {
        // Find the month index
        const monthIndex = monthRange.findIndex(m => m.value === line.position_month);
        if (monthIndex === -1) return null;

        // Calculate position based on month and week
        // Each month column is divided into 4 weeks (W1, W2, W3, W4)
        const monthColumnWidth = 120; // Should match CSS gantt-month-col width
        const weekWidth = monthColumnWidth / 4;
        
        // Calculate left position:
        // - Base position for the month column (considering freeze columns)
        // - Plus offset for the specific week within the month
        // - Position at the END of the selected week (not the next week)
        const freezeColumnsWidth = 64 + 50 + 200 + 120 + 80; // actions + no + mayor + importe + %
        const leftPosition = freezeColumnsWidth + (monthIndex * monthColumnWidth) + ((line.position_week - 1) * weekWidth) + weekWidth;

        return (
          <div
            key={line.id}
            className="absolute top-0 bottom-0 w-0.5 z-10"
            style={{
              left: `${leftPosition}px`,
              backgroundColor: line.color,
              boxShadow: `0 0 3px ${line.color}50`
            }}
          >
            {/* Optional label tooltip */}
            <div 
              className="absolute -top-6 -left-12 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap"
              style={{ pointerEvents: 'auto' }}
            >
              {line.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}