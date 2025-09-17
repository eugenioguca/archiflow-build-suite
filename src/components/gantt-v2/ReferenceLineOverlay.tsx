import React, { useEffect, useState } from 'react';
import { ReferenceLine } from '@/hooks/gantt-v2/useReferenceLines';
import { getTimelineLayout, xForMonthWeek, type TimelineLayout } from '@/utils/gantt-v2/timelineLayout';

interface ReferenceLineOverlayProps {
  referenceLines: ReferenceLine[];
  monthRange: Array<{ value: string; label: string }>;
}

export function ReferenceLineOverlay({ referenceLines, monthRange }: ReferenceLineOverlayProps) {
  const [layout, setLayout] = useState<TimelineLayout | null>(null);

  // Update layout when component mounts or monthRange changes
  useEffect(() => {
    const updateLayout = () => {
      const newLayout = getTimelineLayout(monthRange);
      setLayout(newLayout);
    };

    // Initial layout calculation
    updateLayout();

    // Recalculate on window resize
    const handleResize = () => {
      requestAnimationFrame(updateLayout);
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for more precise DOM changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateLayout);
    });

    const ganttTable = document.querySelector('.gantt-table');
    if (ganttTable) {
      resizeObserver.observe(ganttTable);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [monthRange]);

  if (referenceLines.length === 0 || !layout) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {referenceLines.map((line) => {
        // Calculate precise position using timeline layout
        const x = xForMonthWeek(layout, line.position_month, line.position_week as 1 | 2 | 3 | 4);

        return (
          <div
            key={line.id}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${x}px`,
              width: '2px',
              background: `linear-gradient(${line.color}, ${line.color})`,
              boxShadow: `0 0 0 1px rgba(255,77,79,0.25)`,
              zIndex: 3
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