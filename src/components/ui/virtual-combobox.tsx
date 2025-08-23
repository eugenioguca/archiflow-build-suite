import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface VirtualComboboxItem {
  value: string
  label: string
  codigo?: string
  searchText?: string
  group?: string
}

interface VirtualComboboxProps {
  items: VirtualComboboxItem[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  searchFields?: ('label' | 'codigo' | 'searchText')[]
  showCodes?: boolean
  virtualized?: boolean
  maxHeight?: string
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getSearchableText(item: VirtualComboboxItem, searchFields: string[]): string {
  const texts: string[] = []
  
  if (searchFields.includes('label') && item.label) {
    texts.push(item.label)
  }
  if (searchFields.includes('codigo') && item.codigo) {
    texts.push(item.codigo)
  }
  if (searchFields.includes('searchText') && item.searchText) {
    texts.push(item.searchText)
  }
  
  return texts.join(' ')
}

export function VirtualCombobox({
  items = [],
  value,
  onValueChange,
  placeholder = "Seleccionar opción...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron opciones.",
  className,
  disabled = false,
  loading = false,
  searchFields = ['label'],
  showCodes = false,
  virtualized = false,
  maxHeight = "60vh"
}: VirtualComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [filteredItems, setFilteredItems] = React.useState<VirtualComboboxItem[]>([])
  const [selectedItem, setSelectedItem] = React.useState<VirtualComboboxItem | undefined>()
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const debouncedSearchRef = React.useRef<NodeJS.Timeout>()
  const listRef = React.useRef<HTMLDivElement>(null)

  // Filter and sort items
  React.useEffect(() => {
    if (!search || !items.length) {
      setFilteredItems(items)
      setFocusedIndex(-1)
      return
    }
    
    const normalizedSearch = normalizeSearchText(search)
    const searchTerms = normalizedSearch.split(' ').filter(term => term.length > 0)
    
    const filtered = items.filter(item => {
      const searchableText = normalizeSearchText(
        getSearchableText(item, searchFields)
      )
      return searchTerms.every(term => searchableText.includes(term))
    })
    
    // Sort by relevance
    const sorted = [...filtered].sort((a, b) => {
      const aText = normalizeSearchText(getSearchableText(a, searchFields))
      const bText = normalizeSearchText(getSearchableText(b, searchFields))
      
      // Exact matches first
      const aExact = aText === normalizedSearch
      const bExact = bText === normalizedSearch
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      // Starts with search term
      const aStarts = aText.startsWith(normalizedSearch)
      const bStarts = bText.startsWith(normalizedSearch)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      
      // Alphabetical order
      return aText.localeCompare(bText)
    })
    
    setFilteredItems(sorted)
    setFocusedIndex(sorted.length > 0 ? 0 : -1)
  }, [items, search, searchFields])

  // Update selected item when value changes
  React.useEffect(() => {
    const found = items.find((item) => item?.value === value)
    setSelectedItem(found)
  }, [items, value])

  // Focus search input when opened
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Debounced search handler
  const handleSearchChange = React.useCallback((searchValue: string) => {
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current)
    }
    
    debouncedSearchRef.current = setTimeout(() => {
      setSearch(searchValue)
    }, 100) // Faster debounce
  }, [])

  // Handle item selection
  const handleSelect = React.useCallback((selectedValue: string) => {
    onValueChange?.(selectedValue === value ? "" : selectedValue)
    setOpen(false)
    setSearch("")
    setFocusedIndex(-1)
  }, [onValueChange, value])

  // Keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
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

  // Scroll focused item into view
  React.useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement
      if (focusedElement) {
        focusedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [focusedIndex])

  const displayLabel = React.useMemo(() => {
    if (!selectedItem) return placeholder
    
    if (showCodes && selectedItem.codigo) {
      return `${selectedItem.codigo} - ${selectedItem.label}`
    }
    
    return selectedItem.label
  }, [selectedItem, placeholder, showCodes])

  const effectiveSearchPlaceholder = showCodes 
    ? "Buscar por código o nombre..." 
    : searchPlaceholder

  // Dynamic height calculation
  const dynamicHeight = React.useMemo(() => {
    const itemCount = filteredItems.length
    const itemHeight = 40 // Approximate height per item
    const calculatedHeight = Math.min(itemCount * itemHeight, 400)
    return `min(${calculatedHeight}px, ${maxHeight})`
  }, [filteredItems.length, maxHeight])

  // Virtualized rendering for large lists
  const itemsToRender = React.useMemo(() => {
    if (!virtualized || filteredItems.length < 100) {
      return filteredItems
    }
    
    // Simple virtualization - render visible + buffer
    const startIndex = Math.max(0, focusedIndex - 10)
    const endIndex = Math.min(filteredItems.length, focusedIndex + 20)
    
    return filteredItems.slice(startIndex, endIndex)
  }, [filteredItems, virtualized, focusedIndex])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando...
              </div>
            ) : (
              displayLabel
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 z-[9999]" 
        align="start"
        sideOffset={4}
        avoidCollisions={true}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={searchInputRef}
            placeholder={effectiveSearchPlaceholder}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 h-8"
          />
        </div>
        
        <ScrollArea 
          style={{ maxHeight: dynamicHeight }}
          className="overflow-hidden"
        >
          <div ref={listRef} className="p-1">
            {filteredItems.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              itemsToRender.map((item, index) => {
                const actualIndex = virtualized && filteredItems.length >= 100 
                  ? filteredItems.indexOf(item)
                  : index
                
                const itemLabel = showCodes && item.codigo 
                  ? `${item.codigo} - ${item.label}`
                  : item.label
                
                const isSelected = value === item.value
                const isFocused = focusedIndex === actualIndex
                
                return (
                  <div
                    key={item.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                      isSelected && "bg-accent text-accent-foreground",
                      isFocused && !isSelected && "bg-accent/50",
                      "hover:bg-accent/80"
                    )}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => setFocusedIndex(actualIndex)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{itemLabel}</div>
                      {item.group && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.group}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}