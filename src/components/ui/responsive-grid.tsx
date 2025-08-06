import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  adaptToMobile?: boolean
}

const ResponsiveGrid = React.forwardRef<
  HTMLDivElement,
  ResponsiveGridProps
>(({ 
  className, 
  cols = { default: 1, md: 2 }, 
  gap = 4, 
  adaptToMobile = true,
  children,
  ...props 
}, ref) => {
  const gridClasses = React.useMemo(() => {
    const baseClasses = ["grid"]
    
    // Add gap
    baseClasses.push(`gap-${gap}`)
    
    // Add responsive columns
    if (cols.default) baseClasses.push(`grid-cols-${cols.default}`)
    if (cols.sm) baseClasses.push(`sm:grid-cols-${cols.sm}`)
    if (cols.md) baseClasses.push(`md:grid-cols-${cols.md}`)
    if (cols.lg) baseClasses.push(`lg:grid-cols-${cols.lg}`)
    if (cols.xl) baseClasses.push(`xl:grid-cols-${cols.xl}`)
    
    // Force single column on mobile if adaptToMobile is true
    if (adaptToMobile) {
      baseClasses.push("grid-cols-1")
      if (cols.sm) baseClasses.push(`sm:grid-cols-${cols.sm || cols.default}`)
    }
    
    return baseClasses.join(" ")
  }, [cols, gap, adaptToMobile])

  return (
    <div
      ref={ref}
      className={cn(gridClasses, className)}
      {...props}
    >
      {children}
    </div>
  )
})
ResponsiveGrid.displayName = "ResponsiveGrid"

export { ResponsiveGrid }