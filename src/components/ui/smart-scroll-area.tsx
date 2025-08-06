import * as React from "react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SmartScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollArea> {
  maxHeight?: string
  showScrollIndicator?: boolean
  autoDetectOverflow?: boolean
}

const SmartScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollArea>,
  SmartScrollAreaProps
>(({ 
  className, 
  children, 
  maxHeight = "calc(100vh - 200px)", 
  showScrollIndicator = true,
  autoDetectOverflow = true,
  ...props 
}, ref) => {
  const [isOverflowing, setIsOverflowing] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!autoDetectOverflow || !contentRef.current) return

    const checkOverflow = () => {
      const element = contentRef.current
      if (element) {
        const hasOverflow = element.scrollHeight > element.clientHeight
        setIsOverflowing(hasOverflow)
      }
    }

    // Initial check
    checkOverflow()

    // Check on resize
    const resizeObserver = new ResizeObserver(checkOverflow)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [autoDetectOverflow])

  return (
    <div className="relative">
      <ScrollArea
        ref={ref}
        className={cn("w-full", className)}
        style={{ maxHeight }}
        {...props}
      >
        <div ref={contentRef} className="w-full">
          {children}
        </div>
        <ScrollBar />
      </ScrollArea>
      
      {showScrollIndicator && isOverflowing && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/80 to-transparent pointer-events-none flex items-end justify-center">
          <div className="text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded-t-md">
            Desplázate para ver más
          </div>
        </div>
      )}
    </div>
  )
})
SmartScrollArea.displayName = "SmartScrollArea"

export { SmartScrollArea }