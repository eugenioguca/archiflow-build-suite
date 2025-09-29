/**
 * Remote Combobox Component - Planning v2
 * Searchable dropdown with remote data fetching, pagination, and infinite scroll
 * Replicates UX/keyboard behavior from TU module (without importing from it)
 * Spanish UI (es-MX)
 * 
 * Features:
 * - Debounce 250ms, min 2 chars to search
 * - Keyboard navigation: ↑/↓, Enter to select, Esc to close, Tab confirms
 * - Infinite scroll pagination (20 items/page)
 * - Timeout 5s with 1 retry
 * - Sanitized queries (trim, max 64 chars)
 * - Accessible: ARIA roles, focus management
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronsUpDown, Loader2, X, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { Label } from '@/components/ui/label';

export interface RemoteComboboxItem {
  id: string;
  label: string;
  metadata?: Record<string, any>;
}

export interface RemoteComboboxProps {
  label?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  emptyText?: string;
  errorText?: string;
  searchPlaceholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  fetchItems: (query: string, page: number, limit: number) => Promise<{
    items: RemoteComboboxItem[];
    nextPage: number | null;
  }>;
  formatItem?: (item: RemoteComboboxItem) => React.ReactNode;
  className?: string;
  minChars?: number; // Min chars to trigger search (default: 2)
}

export function RemoteCombobox({
  label,
  value,
  onChange,
  placeholder = 'Selecciona una opción...',
  emptyText = 'Sin resultados',
  errorText = 'Error al cargar. Reintenta.',
  searchPlaceholder = 'Buscar...',
  helperText,
  disabled = false,
  required = false,
  fetchItems,
  formatItem,
  className,
  minChars = 2,
}: RemoteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RemoteComboboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RemoteComboboxItem | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const debouncedSearch = useDebounce(search, 250); // TU-style: 250ms debounce
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sanitize search query (TU-style: trim, max 64 chars)
  const sanitizeQuery = (q: string): string => q.trim().slice(0, 64);

  // Load initial data or search results with retry logic (TU-style)
  const loadItems = useCallback(async (query: string, pageNum: number, append = false, isRetry = false) => {
    // Sanitize query
    const sanitizedQuery = sanitizeQuery(query);
    
    // Skip search if below min chars (unless clearing)
    if (sanitizedQuery.length > 0 && sanitizedQuery.length < minChars) {
      setItems([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(false);

    try {
      // TU-style: 20 items per page, 5s timeout, 1 retry
      const result = await Promise.race([
        fetchItems(sanitizedQuery, pageNum, 20),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      if (!abortControllerRef.current?.signal.aborted) {
        setItems(prev => append ? [...prev, ...result.items] : result.items);
        setHasMore(result.nextPage !== null);
        setPage(result.nextPage || pageNum);
        setRetryCount(0); // Reset retry on success
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error loading items:', err);
        
        // TU-style: 1 retry on failure
        if (!isRetry && retryCount === 0) {
          setRetryCount(1);
          setTimeout(() => loadItems(query, pageNum, append, true), 1000);
        } else {
          setError(true);
        }
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchItems, minChars, retryCount]);

  // Load on search change
  useEffect(() => {
    if (open) {
      loadItems(debouncedSearch, 1, false);
    }
  }, [debouncedSearch, open, loadItems]);

  // Load selected item label when value changes
  useEffect(() => {
    if (value && items.length > 0) {
      const item = items.find(i => i.id === value);
      if (item) {
        setSelectedItem(item);
      }
    } else if (!value) {
      setSelectedItem(null);
    }
  }, [value, items]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!listRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadItems(debouncedSearch, page, true);
    }
  }, [loading, hasMore, page, debouncedSearch, loadItems]);

  const handleSelect = (itemId: string) => {
    const newValue = itemId === value ? undefined : itemId;
    onChange(newValue);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setSelectedItem(null);
  };

  const handleRetry = () => {
    setRetryCount(0);
    setError(false);
    loadItems(debouncedSearch, 1, false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={label || placeholder}
            aria-busy={loading}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">
              {selectedItem ? selectedItem.label : placeholder}
            </span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
              {value && !disabled && !loading && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false} className="[&_[cmdk-input]]:focus-visible:ring-1">
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList ref={listRef} onScroll={handleScroll}>
              {error ? (
                <div className="p-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{errorText}</p>
                  <p className="text-xs text-muted-foreground">
                    No pudimos cargar resultados. Reintenta.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={loading}
                  >
                    <RotateCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                    Reintentar
                  </Button>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Cargando...
                      </div>
                    ) : search.length > 0 && search.length < minChars ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Escribe al menos {minChars} caracteres para buscar
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {emptyText}
                      </div>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={handleSelect}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            value === item.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate">
                          {formatItem ? formatItem(item) : item.label}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {loading && items.length > 0 && (
                    <div className="flex items-center justify-center p-2 border-t">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-xs text-muted-foreground">Cargando más...</span>
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
