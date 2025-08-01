import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SATKey {
  id: string;
  clave: string;
  descripcion?: string;
  nombre?: string;
  simbolo?: string;
}

interface SATKeySelectorProps {
  type: 'product' | 'unit';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SATKeySelector({
  type,
  value,
  onValueChange,
  placeholder = "Seleccionar clave SAT",
  required = false,
  className,
  disabled = false
}: SATKeySelectorProps) {
  const [open, setOpen] = useState(false);
  const [satKeys, setSatKeys] = useState<SATKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSATKeys();
  }, [type]);

  const fetchSATKeys = async () => {
    setLoading(true);
    try {
      const tableName = type === 'product' ? 'sat_product_keys' : 'sat_unit_keys';
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(type === 'product' ? 'descripcion' : 'nombre');

      if (error) throw error;
      setSatKeys(data || []);
    } catch (error) {
      console.error('Error fetching SAT keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedKey = satKeys.find(key => key.clave === value);
  
  const filteredKeys = satKeys.filter(key => {
    const searchLower = searchTerm.toLowerCase();
    return (
      key.clave.toLowerCase().includes(searchLower) ||
      (key.descripcion && key.descripcion.toLowerCase().includes(searchLower)) ||
      (key.nombre && key.nombre.toLowerCase().includes(searchLower)) ||
      (key.simbolo && key.simbolo.toLowerCase().includes(searchLower))
    );
  });

  const displayText = selectedKey 
    ? `${selectedKey.clave} - ${selectedKey.descripcion || selectedKey.nombre || 'Sin descripción'}`
    : placeholder;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
            disabled={disabled}
          >
            <span className="truncate">
              {selectedKey ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedKey.clave}
                  </Badge>
                  <span className="truncate">
                    {selectedKey.descripcion || selectedKey.nombre}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder={`Buscar clave ${type === 'product' ? 'de producto' : 'de unidad'}...`}
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="border-0 focus:ring-0"
              />
            </div>
            <CommandList className="max-h-64">
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Cargando claves SAT...
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-6 text-center text-sm">
                      <div className="text-muted-foreground mb-2">
                        No se encontró la clave SAT
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Puedes escribir la clave manualmente o contactar al administrador para agregarla
                      </div>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredKeys.map((key) => (
                      <CommandItem
                        key={key.id}
                        value={key.clave}
                        onSelect={() => {
                          onValueChange(key.clave);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === key.clave ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              {key.clave}
                            </Badge>
                            {key.simbolo && (
                              <Badge variant="secondary" className="text-xs">
                                {key.simbolo}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {key.descripcion || key.nombre}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
          
          {/* Manual input option */}
          <div className="border-t p-3">
            <div className="text-xs text-muted-foreground mb-2">
              ¿No encuentras la clave? Ingrésala manualmente:
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Ej: 01010101"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (searchTerm.trim()) {
                    onValueChange(searchTerm.trim());
                    setOpen(false);
                    setSearchTerm('');
                  }
                }}
                disabled={!searchTerm.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {required && !value && (
        <div className="text-xs text-destructive mt-1">
          Este campo es requerido
        </div>
      )}
    </div>
  );
}