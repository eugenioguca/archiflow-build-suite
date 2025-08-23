import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableComboboxItem {
  value: string
  label: string
  codigo?: string
  searchText?: string
  group?: string
}

interface SearchableComboboxProps {
  items: SearchableComboboxItem[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  searchFields?: ('label' | 'codigo' | 'searchText')[]
  maxHeight?: string
  showCodes?: boolean
  highlightMatches?: boolean
}

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getSearchableText(item: SearchableComboboxItem, searchFields: string[]): string {
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

export function SearchableCombobox({
  items = [],
  value,
  onValueChange,
  placeholder = "Seleccionar opción...",
  searchPlaceholder,
  emptyText = "No se encontraron opciones.",
  className,
  disabled = false,
  loading = false,
  searchFields = ['label'],
  maxHeight = "300px",
  showCodes = false,
  highlightMatches = false
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  // Ensure items and searchFields are always arrays
  const safeItems = React.useMemo(() => items || [], [items])
  const safeSearchFields = React.useMemo(() => searchFields || ['label'], [searchFields])
  
  // Debounced search to improve performance
  const debouncedSearch = React.useMemo(() => {
    const timeoutRef = React.useRef<NodeJS.Timeout>()
    
    return (searchValue: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        setSearch(searchValue || "")
      }, 150)
    }
  }, [])

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!search || !safeItems.length) return safeItems
    
    const normalizedSearch = normalizeSearchText(search)
    const searchTerms = normalizedSearch.split(' ').filter(term => term.length > 0)
    
    return safeItems.filter(item => {
      const searchableText = normalizeSearchText(
        getSearchableText(item, safeSearchFields)
      )
      
      return searchTerms.every(term => searchableText.includes(term))
    })
  }, [safeItems, search, safeSearchFields])

  // Sort filtered items by relevance
  const sortedItems = React.useMemo(() => {
    if (!search || !filteredItems.length) return filteredItems
    
    const normalizedSearch = normalizeSearchText(search)
    
    return [...filteredItems].sort((a, b) => {
      const aText = normalizeSearchText(getSearchableText(a, safeSearchFields))
      const bText = normalizeSearchText(getSearchableText(b, safeSearchFields))
      
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
  }, [filteredItems, search, safeSearchFields])

  const selectedItem = React.useMemo(() => 
    safeItems.find((item) => item?.value === value), 
    [safeItems, value]
  )

  const displayLabel = React.useMemo(() => {
    if (!selectedItem) return placeholder
    
    if (showCodes && selectedItem.codigo) {
      return `${selectedItem.codigo} - ${selectedItem.label}`
    }
    
    return selectedItem.label
  }, [selectedItem, placeholder, showCodes])

  const effectiveSearchPlaceholder = searchPlaceholder || 
    (showCodes ? "Buscar por código o nombre..." : "Buscar...")

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
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={effectiveSearchPlaceholder}
            onValueChange={debouncedSearch}
          />
          <CommandList style={{ maxHeight }}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {sortedItems.map((item) => {
                const itemLabel = showCodes && item.codigo 
                  ? `${item.codigo} - ${item.label}`
                  : item.label
                
                return (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={(currentValue) => {
                      onValueChange?.(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === item.value ? "opacity-100" : "opacity-0"
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
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}