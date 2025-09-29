/**
 * SearchableComboboxV2 - Remote, paginated combobox with keyboard nav
 * Mirrors TU implementation with proper layering, focus, and tooltip handling
 */
import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, X, RotateCw } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDisableTooltipsWhenOpen } from '../hooks/useDisableTooltipsWhenOpen';

export type SearchableComboboxItem = {
  value: string;
  label: string;
  codigo?: string;
  searchText: string;
};

export interface SearchableComboboxV2Props {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  showCodes?: boolean;
  searchFields?: Array<'label' | 'codigo' | 'searchText'>;
  value: string | undefined;
  onValueChange: (v: string | undefined) => void;
  fetchPage: (params: { q: string; page: number; limit: number }) => Promise<{
    items: SearchableComboboxItem[];
    nextPage: number | null;
  }>;
  className?: string;
}

export default function SearchableComboboxV2({
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Sin resultados',
  loading: externalLoading = false,
  disabled = false,
  showCodes = true,
  value,
  onValueChange,
  fetchPage,
  className,
}: SearchableComboboxV2Props) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<SearchableComboboxItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nextPage, setNextPage] = React.useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout>();

  // Disable tooltips when open
  useDisableTooltipsWhenOpen(open);

  // Fetch initial page
  const fetchData = React.useCallback(
    async (query: string, page: number) => {
      if (query.length > 0 && query.length < 2) {
        setItems([]);
        setNextPage(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchPage({ q: query, page, limit: 20 });
        if (page === 1) {
          setItems(result.items);
        } else {
          setItems((prev) => [...prev, ...result.items]);
        }
        setNextPage(result.nextPage);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar. Reintenta.');
        setItems([]);
        setNextPage(null);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage]
  );

  // Debounced search
  React.useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchData(search, 1);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, open, fetchData]);

  // Load more on scroll
  const handleScroll = React.useCallback(() => {
    if (!listRef.current || loading || !nextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      fetchData(search, nextPage);
    }
  }, [loading, nextPage, search, fetchData]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (items[selectedIndex]) {
            onValueChange(items[selectedIndex].value);
            setOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, items, selectedIndex, onValueChange]
  );

  // Selected item
  const selectedItem = React.useMemo(
    () => items.find((item) => item.value === value),
    [items, value]
  );

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      fetchData('', 1);
    }
  }, [open, fetchData]);

  // Focus input on open
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled || externalLoading}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {selectedItem ? (
              <span className="flex items-center gap-2">
                {showCodes && selectedItem.codigo && (
                  <span className="font-mono text-xs opacity-60">{selectedItem.codigo}</span>
                )}
                <span>{selectedItem.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          {externalLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions
          collisionPadding={8}
          className="z-[100] w-[min(96vw,36rem)] p-0 shadow-xl border bg-popover rounded-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            if ((e as any).target?.closest('.scrollbar')) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex flex-col">
            {/* Search input */}
            <div className="flex items-center border-b px-3 py-2 gap-2">
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setSearch('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {error && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => fetchData(search, 1)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Results list */}
            <div
              ref={listRef}
              className="max-h-[300px] overflow-y-auto"
              onScroll={handleScroll}
            >
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-6 text-sm text-destructive">
                  <p>{error}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => fetchData(search, 1)}
                    className="mt-2"
                  >
                    Reintentar
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyText}
                </div>
              ) : (
                <>
                  {items.map((item, index) => (
                    <button
                      key={item.value}
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm outline-none transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        index === selectedIndex && 'bg-accent text-accent-foreground',
                        value === item.value && 'bg-primary/10'
                      )}
                      onClick={() => {
                        onValueChange(item.value);
                        setOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value === item.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {showCodes && item.codigo && (
                        <span className="font-mono text-xs opacity-60 shrink-0">
                          {item.codigo}
                        </span>
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}

                  {loading && items.length > 0 && (
                    <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando más...
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Clear button */}
            {value && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onValueChange(undefined);
                    setOpen(false);
                  }}
                >
                  Limpiar selección
                </Button>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
