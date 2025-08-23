import * as React from "react"
import { SearchableCombobox, type SearchableComboboxItem } from "./searchable-combobox"
import { FormControl } from "./form"

interface HookFormComboboxProps {
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

/**
 * Wrapper optimizado para SearchableCombobox que funciona perfectamente con React Hook Form
 * Elimina conflictos de FormControl y asegura el comportamiento correcto
 */
export function HookFormCombobox({
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
  highlightMatches = false
}: HookFormComboboxProps) {
  // Solo renderizar si hay items o si está en loading
  const shouldRender = loading || (items && items.length > 0)

  if (!shouldRender) {
    return (
      <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
        <span className="text-muted-foreground">
          {emptyText || "Sin datos disponibles"}
        </span>
      </div>
    )
  }

  return (
    <SearchableCombobox
      items={items || []}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
      disabled={disabled}
      loading={loading}
      searchFields={searchFields}
      maxHeight={maxHeight}
      showCodes={showCodes}
      highlightMatches={highlightMatches}
    />
  )
}