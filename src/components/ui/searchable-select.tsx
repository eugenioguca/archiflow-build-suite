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

  // Enhanced focus management for dialog context
  React.useEffect(() => {
    if (open && inputRef.current) {
      console.log('SearchableSelect: Setting focus on input (enhanced for dialog)')
      
      const focusInput = () => {
        if (inputRef.current) {
          // Force focus even in dialog context
          inputRef.current.focus({ preventScroll: true })
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
          console.log('SearchableSelect: Enhanced focus set, activeElement:', document.activeElement === inputRef.current, 'input focused:', inputRef.current === document.activeElement)
        }
      }
      
      // Multiple focus attempts for dialog context
      focusInput()
      const timeoutId1 = setTimeout(focusInput, 10)
      const timeoutId2 = setTimeout(focusInput, 50)
      const timeoutId3 = setTimeout(focusInput, 100)
      
      // Add focus listener to re-focus if focus gets stolen
      const handleFocusOut = (e: FocusEvent) => {
        // Only refocus if focus goes outside the popover content
        const popoverContent = inputRef.current?.closest('[data-radix-popover-content]')
        if (popoverContent && !popoverContent.contains(e.relatedTarget as Node)) {
          setTimeout(() => {
            if (open && inputRef.current && document.activeElement !== inputRef.current) {
              console.log('SearchableSelect: Re-focusing input after focus steal')
              inputRef.current.focus({ preventScroll: true })
            }
          }, 10)
        }
      }
      
      document.addEventListener('focusout', handleFocusOut)
      
      return () => {
        clearTimeout(timeoutId1)
        clearTimeout(timeoutId2)
        clearTimeout(timeoutId3)
        document.removeEventListener('focusout', handleFocusOut)
      }
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
    console.log('SearchableSelect: Selecting item:', selectedValue)
    onValueChange?.(selectedValue)
    setOpen(false)
    setSearch("")
    setFocusedIndex(-1)
  }, [onValueChange])

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
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border shadow-md"
        align="start"
        sideOffset={4}
        style={{ zIndex: 9999 }}
        onOpenAutoFocus={(e) => {
          // Allow natural focus behavior but also manually focus
          if (inputRef.current) {
            setTimeout(() => {
              inputRef.current?.focus()
              console.log('SearchableSelect: Manual focus after auto-focus, activeElement:', document.activeElement === inputRef.current)
            }, 0)
          }
        }}
      >
        <div className="flex items-center border-b px-3 py-2" role="combobox" aria-expanded={open} aria-controls="searchable-select-listbox">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            type="text"
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
            onFocus={(e) => {
              console.log('SearchableSelect: Input focused, activeElement:', document.activeElement === e.target)
            }}
            onBlur={(e) => {
              console.log('SearchableSelect: Input blur, relatedTarget:', e.relatedTarget)
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            tabIndex={0}
            aria-autocomplete="list"
            aria-activedescendant={focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
            className="h-8 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            style={{ pointerEvents: 'auto' }}
          />
        </div>
        
        <div 
          id="searchable-select-listbox"
          ref={scrollContainerRef}
          role="listbox"
          className="max-h-[300px] overflow-y-auto overflow-x-hidden bg-background searchable-select-scroll"
          tabIndex={-1}
          style={{ 
            pointerEvents: 'auto',
            touchAction: 'pan-y',
            scrollBehavior: 'smooth'
          }}
          onKeyDown={(e) => {
            // Don't interfere with input key handling
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.stopPropagation()
              inputRef.current?.focus()
            }
          }}
          onWheel={(e) => {
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
                  id={`option-${index}`}
                  ref={el => itemRefs.current[index] = el}
                  role="option"
                  aria-selected={item.value === value}
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
                    console.log('SearchableSelect: Item clicked:', item.value)
                    handleSelect(item.value)
                  }}
                  onMouseEnter={() => {
                    console.log('SearchableSelect: Mouse enter on index:', index)
                    handleMouseEnter(index)
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault() // Prevent focus loss from input
                    console.log('SearchableSelect: Mouse down on item, preventing default')
                  }}
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