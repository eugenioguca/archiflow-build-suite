import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';

const AVAILABLE_FIELDS = [
  { key: 'cantidad_real', label: 'Cantidad Real', description: 'Cantidad base del concepto' },
  { key: 'desperdicio_pct', label: '% Desperdicio', description: 'Porcentaje de desperdicio' },
  { key: 'cantidad', label: 'Cantidad', description: 'Cantidad con desperdicio' },
  { key: 'precio_real', label: 'Precio Real', description: 'Precio unitario base' },
  { key: 'honorarios_pct', label: '% Honorarios', description: 'Porcentaje de honorarios' },
  { key: 'pu', label: 'PU', description: 'Precio unitario con honorarios' },
  { key: 'total', label: 'Total', description: 'Importe total' },
];

const AGGREGATIONS = [
  { key: 'SUM', label: 'SUM', description: 'Suma de valores' },
  { key: 'AVG', label: 'AVG', description: 'Promedio de valores' },
  { key: 'MIN', label: 'MIN', description: 'Valor mínimo' },
  { key: 'MAX', label: 'MAX', description: 'Valor máximo' },
  { key: 'COUNT', label: 'COUNT', description: 'Contar registros' },
];

interface FormulaAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FormulaAutocomplete({ value, onChange, placeholder }: FormulaAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSelect = (selectedKey: string) => {
    // Insert the selected key at cursor position or append
    const newValue = value ? `${value} ${selectedKey}` : selectedKey;
    onChange(newValue);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Ej: SUM(total) / COUNT(*)"}
          className="flex-1"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Command>
              <CommandInput 
                placeholder="Buscar campos o agregaciones..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No se encontraron resultados</CommandEmpty>
                
                <CommandGroup heading="Campos disponibles">
                  {AVAILABLE_FIELDS.map((field) => (
                    <CommandItem
                      key={field.key}
                      value={field.key}
                      onSelect={() => handleSelect(field.key)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-xs text-muted-foreground">{field.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Agregaciones">
                  {AGGREGATIONS.map((agg) => (
                    <CommandItem
                      key={agg.key}
                      value={agg.key}
                      onSelect={() => handleSelect(agg.key)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{agg.label}</span>
                        <span className="text-xs text-muted-foreground">{agg.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">
        Usa campos disponibles y agregaciones (SUM, AVG, MIN, MAX, COUNT) para crear fórmulas personalizadas.
        Ejemplo: SUM(total) / COUNT(*)
      </p>
    </div>
  );
}
