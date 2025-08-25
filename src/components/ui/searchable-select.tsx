import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([])

  // Find selected item
  const selectedItem = React.useMemo(() => 
    items.find(item => item.value === value),
    [items, value]
  )

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items
    
    const normalizedSearch = normalizeText(search)
    
    return items.filter(item => {
      const searchFields = [
        item.label,
        item.codigo || '',
        item.searchText || ''
      ].join(' ')
      
      return normalizeText(searchFields).includes(normalizedSearch)
    })
  }, [items, search])

  // Reset focused index when filtered items change
  React.useEffect(() => {
    setFocusedIndex(-1)
  }, [filteredItems])

  // Focus input when popover opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Scroll focused item into view
  const scrollToItem = React.useCallback((index: number) => {
    const item = itemRefs.current[index]
    if (item && scrollAreaRef.current) {
      item.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = focusedIndex < filteredItems.length - 1 ? focusedIndex + 1 : 0
        setFocusedIndex(nextIndex)
        scrollToItem(nextIndex)
        break
        
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : filteredItems.length - 1
        setFocusedIndex(prevIndex)
        scrollToItem(prevIndex)
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
        break
    }
  }, [open, focusedIndex, filteredItems, scrollToItem])

  // Handle item selection
  const handleSelect = React.useCallback((selectedValue: string) => {
    onValueChange?.(selectedValue)
    setOpen(false)
    setSearch("")
    setFocusedIndex(-1)
  }, [onValueChange])

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
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
          />
        </div>
        
        <ScrollArea 
          ref={scrollAreaRef}
          className="max-h-[300px] overflow-auto searchable-select-scroll"
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
                  onClick={() => handleSelect(item.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}