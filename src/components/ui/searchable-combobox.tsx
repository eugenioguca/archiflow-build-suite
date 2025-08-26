import * as React from "react"
import { VirtualCombobox, type VirtualComboboxItem } from "./virtual-combobox"

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
  portalContainer?: HTMLElement | null
}

export function SearchableCombobox({
  items,
  value,
  onValueChange,
  placeholder = "Seleccionar opción...",
  searchPlaceholder,
  emptyText = "No se encontraron opciones.",
  className,
  disabled = false,
  loading = false,
  searchFields,
  maxHeight = "300px",
  showCodes = false,
  highlightMatches = false,
  portalContainer
}: SearchableComboboxProps) {
  // Convert SearchableComboboxItem to VirtualComboboxItem (they're the same interface)
  const virtualItems: VirtualComboboxItem[] = React.useMemo(() => 
    items || [], 
    [items]
  )

  return (
    <VirtualCombobox
      items={virtualItems}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
      disabled={disabled}
      loading={loading}
      searchFields={searchFields}
      showCodes={showCodes}
      maxHeight={maxHeight}
      virtualized={virtualItems.length > 100} // Auto-enable virtualization for large lists
      portalContainer={portalContainer}
    />
  )
}