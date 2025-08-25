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

  // Simplified focus management
  React.useEffect(() => {
    if (open && inputRef.current) {
      console.log('SearchableSelect: Setting focus on input')
      // Single focus attempt with minimal delay
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          console.log('SearchableSelect: Focus set on input')
        }
      }, 10)
      
      return () => clearTimeout(timeoutId)
    }
  }, [open])

  // Maintain input focus during interactions
  React.useEffect(() => {
    if (open && inputRef.current) {
      const input = inputRef.current
      
      const handleFocusOut = (e: FocusEvent) => {
        // Keep focus unless clicking completely outside the popover
        const isClickingInsidePopover = e.relatedTarget && 
          (e.relatedTarget as Element).closest('[data-radix-popover-content]')
        
        if (isClickingInsidePopover) {
          // Prevent focus loss and refocus after a minimal delay
          setTimeout(() => input.focus(), 0)
        }
      }

      input.addEventListener('focusout', handleFocusOut)
      return () => input.removeEventListener('focusout', handleFocusOut)
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

  // Optimized keyboard navigation - only intercept specific keys
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    console.log('SearchableSelect: Key pressed:', e.key, 'Character code:', e.keyCode)
    
    if (!open) return

    // Only intercept specific navigation keys
    const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab']
    if (!navigationKeys.includes(e.key)) {
      console.log('SearchableSelect: Allowing normal key input for:', e.key)
      return // Let normal typing through
    }

    console.log('SearchableSelect: Handling navigation key:', e.key)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        const nextIndex = focusedIndex < filteredItems.length - 1 ? focusedIndex + 1 : 0
        setFocusedIndex(nextIndex)
        scrollToItem(nextIndex)
        break
        
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : filteredItems.length - 1
        setFocusedIndex(prevIndex)
        scrollToItem(prevIndex)
        break
        
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        if (focusedIndex >= 0 && filteredItems[focusedIndex]) {
          handleSelect(filteredItems[focusedIndex].value)
        }
        break
        
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        break
        
      case 'Tab':
        // Allow tab to close and move to next element
        setOpen(false)
        break
    }
  }, [open, focusedIndex, filteredItems, scrollToItem])

  // Handle item selection with better event handling
  const handleSelect = React.useCallback((selectedValue: string) => {
    onValueChange?.(selectedValue)
    setOpen(false)
    setSearch("")
    setFocusedIndex(-1)
  }, [onValueChange])

  // Handle mouse enter with debounce to prevent excessive updates
  const handleMouseEnter = React.useCallback((index: number) => {
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
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border shadow-md"
        align="start"
        sideOffset={4}
        container={typeof document !== 'undefined' ? document.querySelector('[data-radix-dialog-content]') || document.body : undefined}
        style={{ zIndex: 9999 }}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          // Focus will be handled by our useEffect
        }}
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              console.log('SearchableSelect: onChange triggered with value:', e.target.value)
              setSearch(e.target.value)
            }}
            onInput={(e) => {
              console.log('SearchableSelect: onInput triggered with value:', (e.target as HTMLInputElement).value)
              setSearch((e.target as HTMLInputElement).value)
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            tabIndex={0}
            className="h-8 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            style={{ pointerEvents: 'auto' }}
          />
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="max-h-[300px] overflow-y-auto overflow-x-hidden bg-background searchable-select-scroll"
          tabIndex={-1}
          style={{ 
            pointerEvents: 'auto',
            touchAction: 'pan-y',
            scrollBehavior: 'smooth'
          }}
          onKeyDown={(e) => {
            // Handle scroll with keyboard in the container
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.stopPropagation()
              // Let the input handler manage this
              inputRef.current?.focus()
            }
          }}
          onWheel={(e) => {
            // Ensure scroll events are not blocked
            e.stopPropagation()
          }}
        >
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            <div className="p-1">
              {filteredItems.map((item, index) => (
                <div
                  key={item.value}
                  ref={el => itemRefs.current[index] = el}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    item.value === value && "bg-accent text-accent-foreground",
                    focusedIndex === index && "bg-accent text-accent-foreground"
                  )}
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSelect(item.value)
                  }}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      item.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 truncate">
                    {showCodes && item.codigo && (
                      <span className="text-muted-foreground mr-2">
                        {item.codigo}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}