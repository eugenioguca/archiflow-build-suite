/**
 * Remote Combobox Component
 * Searchable dropdown with remote data fetching, pagination, and infinite scroll
 * Spanish UI (es-MX)
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

export interface RemoteComboboxItem {
  id: string;
  label: string;
  metadata?: Record<string, any>;
}

export interface RemoteComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  emptyText?: string;
  errorText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  fetchItems: (query: string, page: number) => Promise<{
    items: RemoteComboboxItem[];
    nextPage: number | null;
  }>;
  formatItem?: (item: RemoteComboboxItem) => React.ReactNode;
  className?: string;
}

export function RemoteCombobox({
  value,
  onChange,
  placeholder = 'Selecciona una opción...',
  emptyText = 'Sin resultados',
  errorText = 'Error al cargar. Reintenta.',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  fetchItems,
  formatItem,
  className,
}: RemoteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RemoteComboboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RemoteComboboxItem | null>(null);
  
  const debouncedSearch = useDebounce(search, 300);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial data or search results
  const loadItems = useCallback(async (query: string, pageNum: number, append = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(false);

    try {
      const result = await Promise.race([
        fetchItems(query, pageNum),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      if (!abortControllerRef.current?.signal.aborted) {
        setItems(prev => append ? [...prev, ...result.items] : result.items);
        setHasMore(result.nextPage !== null);
        setPage(result.nextPage || pageNum);
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Error loading items:', err);
        setError(true);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchItems]);

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
    loadItems(debouncedSearch, 1, false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {value && !disabled && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList ref={listRef} onScroll={handleScroll}>
            {error ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">{errorText}</p>
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
                  ) : (
                    emptyText
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === item.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {formatItem ? formatItem(item) : item.label}
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
  );
}
