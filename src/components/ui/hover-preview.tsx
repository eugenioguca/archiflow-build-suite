import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface HoverPreviewProps {
  trigger: React.ReactNode
  preview: React.ReactNode
  className?: string
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function HoverPreview({
  trigger,
  preview,
  className,
  delay = 200,
  position = 'top'
}: HoverPreviewProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setShowPreview(true)
    }, delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(null)
    }
    setShowPreview(false)
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {trigger}
      
      {showPreview && (
        <div
          className={cn(
            "absolute z-50 bg-popover/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 min-w-[200px] max-w-[400px]",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            positionClasses[position],
            className
          )}
        >
          {preview}
          
          {/* Arrow indicator */}
          <div 
            className={cn(
              "absolute w-2 h-2 bg-popover border rotate-45",
              position === 'top' && "top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-r-0 border-b-0",
              position === 'bottom' && "bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-l-0 border-t-0",
              position === 'left' && "left-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 border-t-0 border-r-0",
              position === 'right' && "right-full top-1/2 transform -translate-y-1/2 translate-x-1/2 border-b-0 border-l-0"
            )}
          />
        </div>
      )}
    </div>
  )
}