import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const SmartTooltipProvider = TooltipPrimitive.Provider

const SmartTooltip = TooltipPrimitive.Root

const SmartTooltipTrigger = TooltipPrimitive.Trigger

interface SmartTooltipContentProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  title?: string
  description?: string
  shortcut?: string
}

const SmartTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  SmartTooltipContentProps
>(({ className, title, description, shortcut, children, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-lg border bg-popover/95 backdrop-blur-sm px-3 py-2 text-sm text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-w-xs",
      className
    )}
    {...props}
  >
    {children || (
      <div className="space-y-1">
        {title && (
          <div className="font-semibold text-foreground">{title}</div>
        )}
        {description && (
          <div className="text-muted-foreground text-xs leading-relaxed">{description}</div>
        )}
        {shortcut && (
          <div className="flex items-center gap-1 pt-1">
            <span className="text-xs text-muted-foreground">Atajo:</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border font-mono">
              {shortcut}
            </kbd>
          </div>
        )}
      </div>
    )}
  </TooltipPrimitive.Content>
))
SmartTooltipContent.displayName = TooltipPrimitive.Content.displayName

export { SmartTooltip, SmartTooltipTrigger, SmartTooltipContent, SmartTooltipProvider }