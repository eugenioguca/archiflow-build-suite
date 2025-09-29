/**
 * WBS Selector with breadcrumb navigation
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight } from 'lucide-react';
import { tuAdapter } from '../../adapters/tu';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface WBSSelectorProps {
  value: string | null;
  onChange: (code: string | null) => void;
  required?: boolean;
}

export function WBSSelector({ value, onChange, required }: WBSSelectorProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'departamento' | 'mayor' | 'partida' | 'subpartida'>('departamento');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMayor, setSelectedMayor] = useState<string | null>(null);
  const [selectedPartida, setSelectedPartida] = useState<string | null>(null);

  // Fetch dimensions
  const { data: departamentos = [] } = useQuery({
    queryKey: ['tu-departamentos'],
    queryFn: () => tuAdapter.getDepartamentos(),
  });

  const { data: mayores = [] } = useQuery({
    queryKey: ['tu-mayores', selectedDept],
    queryFn: () => tuAdapter.getMayores(selectedDept || undefined),
    enabled: !!selectedDept,
  });

  const { data: partidas = [] } = useQuery({
    queryKey: ['tu-partidas', selectedMayor],
    queryFn: () => tuAdapter.getPartidas(selectedMayor || undefined),
    enabled: !!selectedMayor,
  });

  const { data: subpartidas = [] } = useQuery({
    queryKey: ['tu-subpartidas', selectedPartida],
    queryFn: () => tuAdapter.getSubpartidas(selectedPartida || undefined),
    enabled: !!selectedPartida,
  });

  // Build breadcrumb
  const breadcrumb = useMemo(() => {
    const parts: string[] = [];
    if (selectedDept) {
      const dept = departamentos.find(d => d.departamento === selectedDept);
      if (dept) parts.push(dept.departamento);
    }
    if (selectedMayor) {
      const mayor = mayores.find(m => m.id === selectedMayor);
      if (mayor) parts.push(mayor.nombre);
    }
    if (selectedPartida) {
      const partida = partidas.find(p => p.id === selectedPartida);
      if (partida) parts.push(partida.nombre);
    }
    return parts;
  }, [selectedDept, selectedMayor, selectedPartida, departamentos, mayores, partidas]);

  const handleDepartamentoSelect = (dept: string) => {
    setSelectedDept(dept);
    setSelectedMayor(null);
    setSelectedPartida(null);
    setStep('mayor');
  };

  const handleMayorSelect = (mayorId: string) => {
    setSelectedMayor(mayorId);
    setSelectedPartida(null);
    setStep('partida');
  };

  const handlePartidaSelect = (partidaId: string) => {
    setSelectedPartida(partidaId);
    setStep('subpartida');
  };

  const handleSubpartidaSelect = (subpartidaId: string) => {
    const subpartida = subpartidas.find(s => s.id === subpartidaId);
    if (subpartida) {
      onChange(subpartida.codigo);
      setOpen(false);
    }
  };

  const handleBack = () => {
    if (step === 'subpartida') {
      setStep('partida');
    } else if (step === 'partida') {
      setSelectedMayor(null);
      setStep('mayor');
    } else if (step === 'mayor') {
      setSelectedDept(null);
      setStep('departamento');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
          {value || "Seleccionar WBS..."}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 p-2 border-b text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-6 px-2"
              >
                ←
              </Button>
              {breadcrumb.map((part, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
                  {part}
                </span>
              ))}
            </div>
          )}

          <CommandInput 
            placeholder={
              step === 'departamento' ? "Buscar departamento..." :
              step === 'mayor' ? "Buscar mayor..." :
              step === 'partida' ? "Buscar partida..." :
              "Buscar subpartida..."
            }
          />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>

            {step === 'departamento' && (
              <CommandGroup heading="Departamentos">
                {departamentos.map((dept) => (
                  <CommandItem
                    key={dept.id}
                    value={dept.departamento}
                    onSelect={() => handleDepartamentoSelect(dept.departamento)}
                  >
                    {dept.departamento}
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {step === 'mayor' && (
              <CommandGroup heading="Mayores">
                {mayores.map((mayor) => (
                  <CommandItem
                    key={mayor.id}
                    value={mayor.nombre}
                    onSelect={() => handleMayorSelect(mayor.id)}
                  >
                    <span className="mr-2 text-muted-foreground">{mayor.codigo}</span>
                    {mayor.nombre}
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {step === 'partida' && (
              <CommandGroup heading="Partidas">
                {partidas.map((partida) => (
                  <CommandItem
                    key={partida.id}
                    value={partida.nombre}
                    onSelect={() => handlePartidaSelect(partida.id)}
                  >
                    <span className="mr-2 text-muted-foreground">{partida.codigo}</span>
                    {partida.nombre}
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {step === 'subpartida' && (
              <CommandGroup heading="Subpartidas">
                {subpartidas.map((subpartida) => (
                  <CommandItem
                    key={subpartida.id}
                    value={subpartida.nombre}
                    onSelect={() => handleSubpartidaSelect(subpartida.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === subpartida.codigo ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2 text-muted-foreground">{subpartida.codigo}</span>
                    {subpartida.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
