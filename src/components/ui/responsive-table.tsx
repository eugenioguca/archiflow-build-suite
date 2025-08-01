import * as React from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useIsMobile } from "@/hooks/use-mobile"

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  minWidth?: string
}

const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, minWidth = "600px", ...props }, ref) => {
    const isMobile = useIsMobile()

    if (isMobile) {
      return (
        <div ref={ref} className={cn("relative", className)} {...props}>
          <ScrollArea className="w-full">
            <div 
              className="w-full overflow-x-auto"
              style={{ minWidth }}
            >
              <div className="relative w-full border rounded-md">
                {children}
              </div>
            </div>
            {/* Scroll indicator for mobile */}
            <div className="flex justify-center pt-2">
              <div className="text-xs text-muted-foreground">
                ← Desliza para ver más →
              </div>
            </div>
          </ScrollArea>
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("relative w-full overflow-auto", className)} {...props}>
        <table className="w-full caption-bottom text-sm">
          {children}
        </table>
      </div>
    )
  }
)
ResponsiveTable.displayName = "ResponsiveTable"

const ResponsiveTableWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { minWidth?: string }
>(({ className, children, minWidth = "600px", ...props }, ref) => {
  const isMobile = useIsMobile()
  
  return (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      {isMobile ? (
        <ScrollArea className="w-full">
          <div className="w-full overflow-x-auto" style={{ minWidth }}>
            {children}
          </div>
          <div className="flex justify-center pt-2">
            <div className="text-xs text-muted-foreground">
              ← Desliza para ver más →
            </div>
          </div>
        </ScrollArea>
      ) : (
        children
      )}
    </div>
  )
})
ResponsiveTableWrapper.displayName = "ResponsiveTableWrapper"

export { ResponsiveTable, ResponsiveTableWrapper }