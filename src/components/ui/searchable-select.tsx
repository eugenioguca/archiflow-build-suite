import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface SearchableSelectItem {
  value: string
  label: string
  codigo?: string
  searchText?: string
}

interface SearchableSelectProps {
  items: SearchableSelectItem[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  showCodes?: boolean
}

// Normalize text for search comparison (remove accents, lowercase)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
    .trim()
}

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function SearchableSelect({
  items = [],
  value,
  onValueChange,
  placeholder = "Seleccionar opción...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron opciones.",
  className,
  disabled = false,
  loading = false,
  showCodes = false
}: SearchableSelectProps) {
  // Force browser cache refresh - Component updated to use native scrolling
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])

  // Debounce search for better performance (faster response)
  const debouncedSearch = useDebounce(search, 50)

  // Find selected item
  const selectedItem = React.useMemo(() => 
    items.find(item => item.value === value),
    [items, value]
  )

  // Filter items based on debounced search
  const filteredItems = React.useMemo(() => {
    if (!debouncedSearch.trim()) return items
    
    const normalizedSearch = normalizeText(debouncedSearch)
    
    return items.filter(item => {
      const searchFields = [
        item.label,
        item.codigo || '',
        item.searchText || ''
      ].join(' ')
      
      return normalizeText(searchFields).includes(normalizedSearch)
    })
  }, [items, debouncedSearch])

  // Reset focused index when filtered items change
  React.useEffect(() => {
    setFocusedIndex(-1)
  }, [filteredItems])

  // Simplified focus management (matching VirtualCombobox approach)
  React.useEffect(() => {
    if (open && inputRef.current) {
      console.log('[SearchableSelect] Opening dropdown, focusing input')
      
      // Use the same simple approach that works in VirtualCombobox
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          console.log('[SearchableSelect] Focus set, activeElement === input:', document.activeElement === inputRef.current)
          console.log('[SearchableSelect] activeElement tag:', document.activeElement?.tagName)
          console.log('[SearchableSelect] activeElement type:', (document.activeElement as HTMLInputElement)?.type)
        }
      }, 100)
      
      // Fallback focus attempts for dialog context
      const fallbackTimeouts = [150, 200, 300].map(delay => 
        setTimeout(() => {
          if (open && inputRef.current && document.activeElement !== inputRef.current) {
            console.log(`[SearchableSelect] Fallback focus attempt at ${delay}ms`)
            inputRef.current.focus()
            console.log('[SearchableSelect] Fallback focus result:', document.activeElement === inputRef.current)
          }
        }, delay)
      )
      
      return () => {
        fallbackTimeouts.forEach(clearTimeout)
      }
    }
    
    // Reset search when opening
    if (open) {
      setSearch("")
    }
  }, [open])

  // Scroll focused item into view with better performance
  const scrollToItem = React.useCallback((index: number) => {
    const item = itemRefs.current[index]
    const container = scrollContainerRef.current
    
    if (item && container) {
      const itemRect = item.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      if (itemRect.top < containerRect.top) {
        container.scrollTop -= (containerRect.top - itemRect.top + 8)
      } else if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += (itemRect.bottom - containerRect.bottom + 8)
      }
    }
  }, [])

  // Handle item selection (matching VirtualCombobox approach)
  const handleSelect = React.useCallback((selectedValue: string) => {
    console.log('[SearchableSelect] Selecting value:', selectedValue)
    onValueChange?.(selectedValue === value ? "" : selectedValue)
    setOpen(false)
    setSearch("")
    setFocusedIndex(-1)
  }, [onValueChange, value])

  // Simplified keyboard navigation (matching VirtualCombobox approach)
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    console.log('[SearchableSelect] Key pressed:', e.key, 'keyCode:', e.keyCode, 'activeElement:', document.activeElement?.tagName)
    
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
        
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && filteredItems[focusedIndex]) {
          handleSelect(filteredItems[focusedIndex].value)
        }
        break
        
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearch("")
        setFocusedIndex(-1)
        break
    }
  }, [open, filteredItems, focusedIndex, handleSelect])

  // Handle mouse enter with debounce to prevent excessive updates
  const handleMouseEnter = React.useCallback((index: number) => {
    console.log('SearchableSelect: Setting focusedIndex to:', index)
    setFocusedIndex(index)
  }, [])

  // Display label with optional code
  const displayLabel = React.useMemo(() => {
    if (!selectedItem) return placeholder
    
    if (showCodes && selectedItem.codigo) {
      return `${selectedItem.codigo} - ${selectedItem.label}`
    }
    
    return selectedItem.label
  }, [selectedItem, showCodes, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background",
            !selectedItem && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? "Cargando..." : displayLabel}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0" 
        style={{ zIndex: 10000 }}
        align="start"
        sideOffset={4}
        avoidCollisions={true}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b px-3 py-2" role="combobox" aria-expanded={open} aria-controls="searchable-select-listbox">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              console.log('[SearchableSelect] Input change:', e.target.value)
              setSearch(e.target.value)
            }}
            onFocus={(e) => {
              console.log('[SearchableSelect] Input focus event, activeElement === input:', document.activeElement === e.target)
            }}
            onKeyDown={handleKeyDown}
            className="border-0 shadow-none focus-visible:ring-0 h-8"
          />
        </div>
        
        {/* Native scroll for touchpad compatibility - matching VirtualCombobox */}
        <div 
          ref={scrollContainerRef}
          className="overflow-y-auto overscroll-contain"
          style={{ 
            maxHeight: "300px",
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--border)) transparent'
          }}
        >
          {filteredItems.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <div className="p-1">
              {filteredItems.map((item, index) => {
                const itemLabel = showCodes && item.codigo 
                  ? `${item.codigo} - ${item.label}`
                  : item.label
                
                const isSelected = value === item.value
                const isFocused = focusedIndex === index
                
                return (
                  <div
                    key={item.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                      isSelected && "bg-accent text-accent-foreground",
                      isFocused && !isSelected && "bg-accent/50",
                      "hover:bg-accent/80"
                    )}
                    onClick={() => {
                      console.log('[SearchableSelect] Item clicked:', item.value)
                      handleSelect(item.value)
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{itemLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}