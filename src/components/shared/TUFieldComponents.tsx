import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SearchableCombobox, type SearchableComboboxItem } from '@/components/ui/searchable-combobox';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/CurrencyInput';

// Loading states interface
interface TULoadingStates {
  departamentos: boolean;
  mayores: boolean;
  partidas: boolean;
  subpartidas: boolean;
}

// Hook for TU cascading data
export const useTUCascadingData = () => {
  const [departamentos, setDepartamentos] = useState<SearchableComboboxItem[]>([]);
  const [mayores, setMayores] = useState<SearchableComboboxItem[]>([]);
  const [partidas, setPartidas] = useState<SearchableComboboxItem[]>([]);
  const [subpartidas, setSubpartidas] = useState<SearchableComboboxItem[]>([]);
  
  const [loading, setLoading] = useState<TULoadingStates>({
    departamentos: false,
    mayores: false,
    partidas: false,
    subpartidas: false,
  });

  // Load departamentos
  const loadDepartamentos = async () => {
    setLoading(prev => ({ ...prev, departamentos: true }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_departamentos')
        .select('departamento')
        .eq('activo', true)
        .order('departamento');

      if (error) throw error;

      // Avoid duplicates using Set
      const uniqueDepartamentos = [...new Set(data?.map(item => item.departamento) || [])];
      
      const options = uniqueDepartamentos.map(departamento => ({
        value: departamento,
        label: departamento,
        codigo: departamento
      }));

      setDepartamentos(options);
    } catch (error) {
      console.error('Error loading departamentos:', error);
    } finally {
      setLoading(prev => ({ ...prev, departamentos: false }));
    }
  };

  // Load mayores by departamento
  const loadMayores = async (departamentoId: string) => {
    setLoading(prev => ({ ...prev, mayores: true }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_mayor')
        .select('id, nombre, codigo')
        .eq('departamento', departamentoId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      setMayores(options);
    } catch (error) {
      console.error('Error loading mayores:', error);
      setMayores([]);
    } finally {
      setLoading(prev => ({ ...prev, mayores: false }));
    }
  };

  // Load partidas by mayor
  const loadPartidas = async (mayorId: string) => {
    setLoading(prev => ({ ...prev, partidas: true }));
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts_partidas')
        .select('id, nombre, codigo')
        .eq('mayor_id', mayorId)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;

      const options = data?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      setPartidas(options);
    } catch (error) {
      console.error('Error loading partidas:', error);
      setPartidas([]);
    } finally {
      setLoading(prev => ({ ...prev, partidas: false }));
    }
  };

  // Load subpartidas by partida (including universals)
  const loadSubpartidas = async (partidaId: string) => {
    setLoading(prev => ({ ...prev, subpartidas: true }));
    try {
      // First get departamento from the selected partida
      const { data: partidaData, error: partidaError } = await supabase
        .from('chart_of_accounts_partidas')
        .select(`
          mayor_id,
          chart_of_accounts_mayor!inner(departamento)
        `)
        .eq('id', partidaId)
        .single();

      if (partidaError) throw partidaError;

      const departamento = partidaData?.chart_of_accounts_mayor?.departamento;

      // Load dependent subpartidas
      const { data: dependientes, error: dependientesError } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('id, nombre, codigo')
        .eq('partida_id', partidaId)
        .eq('activo', true)
        .order('codigo');

      if (dependientesError) throw dependientesError;

      // Load universal subpartidas for the same departamento
      const { data: universales, error: universalesError } = await supabase
        .from('chart_of_accounts_subpartidas')
        .select('id, nombre, codigo')
        .eq('es_global', true)
        .eq('departamento_aplicable', departamento)
        .eq('activo', true)
        .order('codigo');

      if (universalesError) throw universalesError;

      // Combine both types
      const dependientesOptions = dependientes?.map(item => ({
        value: item.id,
        label: item.nombre,
        codigo: item.codigo
      })) || [];

      const universalesOptions = universales?.map(item => ({
        value: item.id,
        label: `${item.nombre} (Universal)`,
        codigo: item.codigo
      })) || [];

      // Combine and sort by codigo
      const allOptions = [...dependientesOptions, ...universalesOptions]
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

      setSubpartidas(allOptions);
    } catch (error) {
      console.error('Error loading subpartidas:', error);
      setSubpartidas([]);
    } finally {
      setLoading(prev => ({ ...prev, subpartidas: false }));
    }
  };

  return {
    departamentos,
    mayores,
    partidas, 
    subpartidas,
    loading,
    loadDepartamentos,
    loadMayores,
    loadPartidas,
    loadSubpartidas,
  };
};

// Departamento Field Component
interface TUDepartamentoFieldProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  portalContainer?: HTMLElement | null;
}

export function TUDepartamentoField({ 
  value, 
  onValueChange, 
  disabled = false,
  portalContainer 
}: TUDepartamentoFieldProps) {
  const { departamentos, loading, loadDepartamentos } = useTUCascadingData();

  useEffect(() => {
    // Auto-load departamentos when component mounts
    loadDepartamentos();
  }, [loadDepartamentos]);

  return (
    <FormItem>
      <FormLabel>Departamento *</FormLabel>
      <FormControl>
        <div data-combobox-root className="pointer-events-auto">
          <SearchableCombobox
            items={departamentos}
            value={value || ''}
            onValueChange={onValueChange}
            placeholder="Seleccionar departamento..."
            searchPlaceholder="Buscar departamento..."
            loading={loading.departamentos}
            disabled={disabled}
            showCodes={false}
            searchFields={['label', 'codigo']}
            portalContainer={portalContainer}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Mayor Field Component
interface TUMayorFieldProps {
  departamentoId?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  portalContainer?: HTMLElement | null;
  onMayorLoad?: (mayores: SearchableComboboxItem[]) => void;
}

export function TUMayorField({ 
  departamentoId,
  value, 
  onValueChange, 
  disabled = false,
  portalContainer,
  onMayorLoad
}: TUMayorFieldProps) {
  const { mayores, loading, loadMayores } = useTUCascadingData();

  useEffect(() => {
    if (departamentoId) {
      loadMayores(departamentoId).then(() => {
        onMayorLoad?.(mayores);
      });
    }
  }, [departamentoId, loadMayores, mayores, onMayorLoad]);

  return (
    <FormItem>
      <FormLabel>Mayor *</FormLabel>
      <FormControl>
        <div data-combobox-root className="pointer-events-auto">
          <SearchableCombobox
            items={mayores}
            value={value || ''}
            onValueChange={onValueChange}
            placeholder={departamentoId ? "Seleccionar mayor..." : "Primero selecciona un departamento"}
            searchPlaceholder="Buscar mayor..."
            loading={loading.mayores}
            disabled={disabled || !departamentoId}
            showCodes={true}
            searchFields={['label', 'codigo']}
            portalContainer={portalContainer}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Partida Field Component  
interface TUPartidaFieldProps {
  mayorId?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  portalContainer?: HTMLElement | null;
}

export function TUPartidaField({ 
  mayorId,
  value, 
  onValueChange, 
  disabled = false,
  portalContainer
}: TUPartidaFieldProps) {
  const { partidas, loading, loadPartidas } = useTUCascadingData();

  useEffect(() => {
    if (mayorId) {
      loadPartidas(mayorId);
    }
  }, [mayorId, loadPartidas]);

  return (
    <FormItem>
      <FormLabel>Partida *</FormLabel>
      <FormControl>
        <div data-combobox-root className="pointer-events-auto">
          <SearchableCombobox
            items={partidas}
            value={value || ''}
            onValueChange={onValueChange}
            placeholder={mayorId ? "Seleccionar partida..." : "Primero selecciona un mayor"}
            searchPlaceholder="Buscar partida..."
            loading={loading.partidas}
            disabled={disabled || !mayorId}
            showCodes={true}
            searchFields={['label', 'codigo']}
            portalContainer={portalContainer}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Subpartida Field Component
interface TUSubpartidaFieldProps {
  partidaId?: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  portalContainer?: HTMLElement | null;
}

export function TUSubpartidaField({ 
  partidaId,
  value, 
  onValueChange, 
  disabled = false,
  portalContainer
}: TUSubpartidaFieldProps) {
  const { subpartidas, loading, loadSubpartidas } = useTUCascadingData();

  useEffect(() => {
    if (partidaId) {
      loadSubpartidas(partidaId);
    }
  }, [partidaId, loadSubpartidas]);

  return (
    <FormItem>
      <FormLabel>Subpartida</FormLabel>
      <FormControl>
        <div data-combobox-root className="pointer-events-auto">
          <SearchableCombobox
            items={subpartidas}
            value={value || ''}
            onValueChange={onValueChange}
            placeholder={partidaId ? "Seleccionar subpartida..." : "Primero selecciona una partida"}
            searchPlaceholder="Buscar subpartida..."
            loading={loading.subpartidas}
            disabled={disabled || !partidaId}
            showCodes={true}
            searchFields={['label', 'codigo']}
            portalContainer={portalContainer}
            virtualized={true}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Unidad Field Component (TU units)
interface TUUnidadFieldProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  portalContainer?: HTMLElement | null;
}

export function TUUnidadField({ 
  value, 
  onValueChange, 
  disabled = false,
  portalContainer
}: TUUnidadFieldProps) {
  const unidadOptions = [
    { value: "PZA", label: "Pieza (PZA)", codigo: "PZA" },
    { value: "M2", label: "Metro Cuadrado (M2)", codigo: "M2" },
    { value: "M3", label: "Metro Cúbico (M3)", codigo: "M3" },
    { value: "ML", label: "Metro Lineal (ML)", codigo: "ML" },
    { value: "KG", label: "Kilogramo (KG)", codigo: "KG" },
    { value: "TON", label: "Tonelada (TON)", codigo: "TON" },
    { value: "LT", label: "Litro (LT)", codigo: "LT" },
    { value: "GAL", label: "Galón (GAL)", codigo: "GAL" },
    { value: "M", label: "Metro (M)", codigo: "M" }
  ];

  return (
    <FormItem>
      <FormLabel>Unidad</FormLabel>
      <FormControl>
        <div data-combobox-root className="pointer-events-auto">
          <SearchableCombobox
            items={unidadOptions}
            value={value || ''}
            onValueChange={onValueChange}
            placeholder="Seleccionar unidad..."
            searchPlaceholder="Buscar unidad..."
            loading={false}
            disabled={disabled}
            showCodes={false}
            searchFields={['label', 'codigo']}
            portalContainer={portalContainer}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Cantidad Field Component
interface TUCantidadFieldProps {
  value?: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}

export function TUCantidadField({ 
  value, 
  onValueChange, 
  disabled = false
}: TUCantidadFieldProps) {
  return (
    <FormItem>
      <FormLabel>Cantidad Requerida</FormLabel>
      <FormControl>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={value || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              onValueChange(0);
            } else {
              const numValue = parseFloat(val);
              onValueChange(isNaN(numValue) ? 0 : numValue);
            }
          }}
          onBlur={(e) => {
            const val = parseFloat(e.target.value);
            if (isNaN(val) || val <= 0) {
              onValueChange(1);
            }
          }}
          className="text-right"
          placeholder="1"
          disabled={disabled}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Precio Unitario Field Component
interface TUPrecioUnitarioFieldProps {
  value?: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}

export function TUPrecioUnitarioField({ 
  value, 
  onValueChange, 
  disabled = false
}: TUPrecioUnitarioFieldProps) {
  return (
    <FormItem>
      <FormLabel>Precio Unitario</FormLabel>
      <FormControl>
        <CurrencyInput
          value={value || 0}
          onChange={onValueChange}
          placeholder="0.00"
          disabled={disabled}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Monto Total Field Component (read-only)
interface TUMontoTotalFieldProps {
  value?: number;
}

export function TUMontoTotalField({ value }: TUMontoTotalFieldProps) {
  return (
    <FormItem>
      <FormLabel>Monto Total</FormLabel>
      <FormControl>
        <Input
          type="text"
          value={new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
          }).format(value || 0)}
          readOnly
          disabled
          className="bg-muted text-right pointer-events-none"
          placeholder="$0.00"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}