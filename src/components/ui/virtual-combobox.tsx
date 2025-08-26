import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import * as PopoverPrimitive from "@radix-ui/react-popover"

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
  portalContainer?: HTMLElement | null
  tooltipSide?: 'left' | 'right' | 'top' | 'bottom'
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

// NUEVO: PopoverContent que permite inyectar el contenedor del portal
const PopoverContentInDialog = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { container?: HTMLElement | null }
>(({ container, ...props }, ref) => {
  return (
    <PopoverPrimitive.Portal container={container ?? undefined}>
      <PopoverPrimitive.Content ref={ref} {...props} />
    </PopoverPrimitive.Portal>
  );
});
PopoverContentInDialog.displayName = "PopoverContentInDialog";

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
  maxHeight = "400px",
  portalContainer,
  tooltipSide = 'left'
}: VirtualComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("") // Input inmediato
  const [debouncedSearch, setDebouncedSearch] = React.useState("") // Search con debounce
  const [filteredItems, setFilteredItems] = React.useState<VirtualComboboxItem[]>([])
  const [selectedItem, setSelectedItem] = React.useState<VirtualComboboxItem | undefined>()
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const [scrollTop, setScrollTop] = React.useState(0)
  
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Debounce para el search (solo para filtrado)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(inputValue)
    }, 150)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Filter and sort items basado en debouncedSearch
  React.useEffect(() => {
    if (!debouncedSearch || !items.length) {
      setFilteredItems(items)
      setFocusedIndex(-1)
      return
    }
    
    const normalizedSearch = normalizeSearchText(debouncedSearch)
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
  }, [items, debouncedSearch, searchFields])

  // Update selected item when value changes
  React.useEffect(() => {
    const found = items.find((item) => item?.value === value)
    setSelectedItem(found)
  }, [items, value])

  // Reset input state when opened
  React.useEffect(() => {
    if (open) {
      setInputValue("")
      setDebouncedSearch("")
      setScrollTop(0)
    }
  }, [open])

  // Removed aggressive focus strategy - let onOpenAutoFocus handle it cleanly

  // Handle item selection
  const handleSelect = React.useCallback((selectedValue: string) => {
    console.log('[VirtualCombobox] Selecting value:', selectedValue)
    onValueChange?.(selectedValue === value ? "" : selectedValue)
    setOpen(false)
    setInputValue("")
    setDebouncedSearch("")
    setFocusedIndex(-1)
  }, [onValueChange, value])

  // Keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    console.log('[VirtualCombobox] KeyDown event:', e.key, 'target:', e.target, 'currentTarget:', e.currentTarget)
    console.log('[VirtualCombobox] Active element during keydown:', document.activeElement?.tagName, document.activeElement?.className)
    
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        console.log('[VirtualCombobox] Arrow Down - focusing next item')
        setFocusedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        console.log('[VirtualCombobox] Arrow Up - focusing previous item')
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && filteredItems[focusedIndex]) {
          console.log('[VirtualCombobox] Enter pressed - selecting item:', filteredItems[focusedIndex].value)
          handleSelect(filteredItems[focusedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        console.log('[VirtualCombobox] Escape pressed - closing dropdown')
        setOpen(false)
        setInputValue("")
        setDebouncedSearch("")
        setFocusedIndex(-1)
        break
    }
  }, [open, filteredItems, focusedIndex, handleSelect])

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

  // Virtualización correcta
  const ITEM_HEIGHT = 36
  const MAX_VISIBLE_ITEMS = Math.floor(parseInt(maxHeight.replace('px', '')) / ITEM_HEIGHT)
  
  const itemsToRender = React.useMemo(() => {
    if (!virtualized || filteredItems.length <= 100) {
      return { items: filteredItems, startIndex: 0, totalHeight: filteredItems.length * ITEM_HEIGHT }
    }
    
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT)
    const endIndex = Math.min(startIndex + MAX_VISIBLE_ITEMS + 5, filteredItems.length) // +5 buffer
    const visibleItems = filteredItems.slice(startIndex, endIndex)
    
    return {
      items: visibleItems,
      startIndex,
      totalHeight: filteredItems.length * ITEM_HEIGHT,
      offsetY: startIndex * ITEM_HEIGHT
    }
  }, [filteredItems, virtualized, scrollTop, MAX_VISIBLE_ITEMS])

  // Handle scroll para virtualización
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div data-combobox-root="true">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
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

        {/* USAR el PopoverContentInDialog con container = portalContainer */}
        <PopoverContentInDialog
          container={portalContainer}
          className="w-[--radix-popover-trigger-width] p-0 relative z-[9999] max-h-96 min-w-[8rem] overflow-visible rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          align="start"
          sideOffset={4}
          style={{ pointerEvents: "auto" }}
          // Evita que Radix intente re-enfocar el trigger
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // foco real en el input apenas se abre
            searchInputRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault(); // no devuelvas foco al trigger
          }}
        >
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={searchInputRef}
              placeholder={effectiveSearchPlaceholder}
              value={inputValue}
              onChange={(e) => {
                console.log('[VirtualCombobox] Input onChange:', e.target.value)
                setInputValue(e.target.value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation() // el Dialog no debe ver estas teclas
                handleKeyDown(e) // flechas / Enter → selección
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="border-0 shadow-none focus-visible:ring-0 h-8"
            />
          </div>
          
          {/* Scroll container with Dialog compatibility */}
          <TooltipProvider delayDuration={300}>
            <div 
              ref={listRef}
              className="overflow-y-auto overscroll-contain"
              style={{ 
                maxHeight: maxHeight,
                scrollbarWidth: 'thin',
                scrollbarColor: 'hsl(var(--border)) transparent',
                pointerEvents: 'auto',
                position: 'relative', // Ensure proper stacking
                zIndex: 1,
              }}
              onScroll={(e) => {
                e.stopPropagation() // Prevent Dialog scroll interference
                handleScroll(e)
              }}
              onWheel={(e) => {
                e.stopPropagation() // Critical: prevent Dialog from blocking wheel events
              }}
              onTouchMove={(e) => {
                e.stopPropagation() // Prevent Dialog from blocking touch scroll
              }}
              // Ensure scroll events work in Dialog context
              data-no-focus-trap="true"
              data-combobox-list="true"
            >
            {virtualized && filteredItems.length > 100 ? (
              // Virtualización completa
              <div style={{ height: itemsToRender.totalHeight, position: 'relative' }}>
                <div 
                  style={{ 
                    transform: `translateY(${itemsToRender.offsetY || 0}px)`,
                    position: 'absolute',
                    width: '100%'
                  }}
                >
                  {itemsToRender.items.map((item, index) => {
                    const actualIndex = (itemsToRender.startIndex || 0) + index
                    const itemLabel = showCodes && item.codigo 
                      ? `${item.codigo} - ${item.label}`
                      : item.label
                    
                    const isSelected = value === item.value
                    const isFocused = focusedIndex === actualIndex
                    
                    return (
                      <Tooltip key={item.value}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative flex cursor-pointer select-none items-center px-2 py-2 text-sm outline-none transition-colors",
                              isSelected && "bg-accent text-accent-foreground",
                              isFocused && !isSelected && "bg-accent/50",
                              "hover:bg-accent/80"
                            )}
                            style={{ 
                              height: ITEM_HEIGHT,
                              pointerEvents: 'auto' // Force pointer events
                            }}
                            onClick={(e) => {
                              console.log('[VirtualCombobox] Item clicked (virtualized):', item.value)
                              console.log('[VirtualCombobox] Click target pointer-events:', window.getComputedStyle(e.currentTarget).pointerEvents)
                              handleSelect(item.value)
                            }}
                            onMouseEnter={(e) => {
                              console.log('[VirtualCombobox] Item mouse enter (virtualized):', actualIndex)
                              console.log('[VirtualCombobox] MouseEnter target pointer-events:', window.getComputedStyle(e.currentTarget).pointerEvents)
                              setFocusedIndex(actualIndex)
                            }}
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
                        </TooltipTrigger>
                        <TooltipContent 
                          side={tooltipSide} 
                          align="start"
                          sideOffset={4}
                          collisionPadding={8}
                          className="max-w-xs text-xs bg-popover text-popover-foreground border border-border rounded-md shadow-lg px-2 py-1 z-[60000]"
                        >
                          <div>{itemLabel}</div>
                          {item.group && (
                            <div className="text-muted-foreground mt-1">{item.group}</div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Renderizado normal
              <div className="p-1">
                {filteredItems.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {emptyText}
                  </div>
                ) : (
                  filteredItems.map((item, index) => {
                    const itemLabel = showCodes && item.codigo 
                      ? `${item.codigo} - ${item.label}`
                      : item.label
                    
                    const isSelected = value === item.value
                    const isFocused = focusedIndex === index
                    
                    return (
                      <Tooltip key={item.value}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors",
                              isSelected && "bg-accent text-accent-foreground",
                              isFocused && !isSelected && "bg-accent/50",
                              "hover:bg-accent/80"
                            )}
                            style={{ pointerEvents: 'auto' }} // Force pointer events
                            onClick={(e) => {
                              console.log('[VirtualCombobox] Item clicked (normal):', item.value)
                              console.log('[VirtualCombobox] Click target pointer-events:', window.getComputedStyle(e.currentTarget).pointerEvents)
                              handleSelect(item.value)
                            }}
                            onMouseEnter={(e) => {
                              console.log('[VirtualCombobox] Item mouse enter (normal):', index)
                              console.log('[VirtualCombobox] MouseEnter target pointer-events:', window.getComputedStyle(e.currentTarget).pointerEvents)
                              setFocusedIndex(index)
                            }}
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
                        </TooltipTrigger>
                         <TooltipContent 
                          side={tooltipSide} 
                          align="start"
                          sideOffset={4}
                          collisionPadding={8}
                          className="max-w-xs text-xs bg-popover text-popover-foreground border border-border rounded-md shadow-lg px-2 py-1 z-[60000]"
                        >
                          <div>{itemLabel}</div>
                          {item.group && (
                            <div className="text-muted-foreground mt-1">{item.group}</div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })
                )}
              </div>
            )}
          </div>
          </TooltipProvider>
        </PopoverContentInDialog>
      </Popover>
    </div>
  )
}