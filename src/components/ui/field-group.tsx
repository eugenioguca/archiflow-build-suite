import * as React from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface FieldGroupProps {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  collapsible?: boolean
  className?: string
}

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  FieldGroupProps
>(({ 
  title, 
  description, 
  children, 
  defaultOpen = true, 
  collapsible = true, 
  className,
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  if (!collapsible) {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        <div className="space-y-1">
          <h3 className="text-lg font-medium leading-none">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        ref={ref}
        className={cn("space-y-4 border rounded-lg p-4", className)}
        {...props}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between space-x-4 text-left">
          <div className="space-y-1 flex-1">
            <h3 className="text-lg font-medium leading-none">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
})
FieldGroup.displayName = "FieldGroup"

export { FieldGroup }