import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SmartTooltip, SmartTooltipContent, SmartTooltipTrigger } from './smart-tooltip'

interface InteractiveCardProps {
  title: string
  description?: string
  children: React.ReactNode
  expandedContent?: React.ReactNode
  className?: string
  defaultExpanded?: boolean
  onExpand?: (expanded: boolean) => void
  actions?: React.ReactNode
  hoverPreview?: React.ReactNode
  badge?: React.ReactNode
}

export function InteractiveCard({
  title,
  description,
  children,
  expandedContent,
  className,
  defaultExpanded = false,
  onExpand,
  actions,
  hoverPreview,
  badge
}: InteractiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isHovered, setIsHovered] = useState(false)

  const handleExpand = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onExpand?.(newExpanded)
  }

  return (
    <Card 
      className={cn(
        "group transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer",
        "border-2 hover:border-primary/30 relative overflow-hidden",
        isExpanded && "shadow-lg border-primary/40",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover preview overlay */}
      {hoverPreview && isHovered && !isExpanded && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 p-4 overflow-hidden">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Vista Previa</div>
            {hoverPreview}
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              {badge}
            </div>
            {description && (
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {actions}
            {expandedContent && (
              <SmartTooltip>
                <SmartTooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExpand}
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </SmartTooltipTrigger>
                <SmartTooltipContent
                  title={isExpanded ? "Contraer" : "Expandir"}
                  description={isExpanded ? "Ocultar detalles adicionales" : "Ver más información"}
                />
              </SmartTooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
        
        {/* Expanded content with smooth animation */}
        {expandedContent && (
          <div className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="pt-4 border-t space-y-4">
              {expandedContent}
            </div>
          </div>
        )}
      </CardContent>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  )
}