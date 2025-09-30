/**
 * TUBreadcrumb - Display TU path (read-only) as breadcrumb
 * Shows: Departamento → Mayor → Partida → Subpartida
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TUBreadcrumbProps {
  conceptoId: string;
}

export function TUBreadcrumb({ conceptoId }: TUBreadcrumbProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['tu-path', conceptoId],
    queryFn: async () => {
      // 1. Get concepto's partida_id
      const { data: concepto, error: conceptoError } = await supabase
        .from('planning_conceptos')
        .select('partida_id, props')
        .eq('id', conceptoId)
        .single();

      if (conceptoError || !concepto) return null;

      // 2. Get partida's TU mapping
      const { data: mapping, error: mappingError } = await supabase
        .from('planning_tu_mapping')
        .select('tu_mayor_id, tu_partida_id')
        .eq('partida_id', concepto.partida_id)
        .maybeSingle();

      if (mappingError || !mapping) {
        return {
          departamento: null,
          mayor: null,
          partida: null,
          subpartida: null,
        };
      }

      // 3. Get TU Subpartida ID from concepto.props.tu_import
      const props = concepto.props as any;
      const tuSubpartidaId = props?.tu_import?.tu_subpartida_id;

      // 4. Fetch all TU entities
      const [mayorRes, partidaRes, subpartidaRes] = await Promise.all([
        mapping.tu_mayor_id
          ? supabase
              .from('chart_of_accounts_mayor')
              .select('departamento, nombre, codigo')
              .eq('id', mapping.tu_mayor_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
        mapping.tu_partida_id
          ? supabase
              .from('chart_of_accounts_partidas')
              .select('nombre, codigo')
              .eq('id', mapping.tu_partida_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
        tuSubpartidaId
          ? supabase
              .from('chart_of_accounts_subpartidas')
              .select('nombre, codigo')
              .eq('id', tuSubpartidaId)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      return {
        departamento: mayorRes.data?.departamento || null,
        mayor: mayorRes.data
          ? { codigo: mayorRes.data.codigo, nombre: mayorRes.data.nombre }
          : null,
        partida: partidaRes.data
          ? { codigo: partidaRes.data.codigo, nombre: partidaRes.data.nombre }
          : null,
        subpartida: subpartidaRes.data
          ? { codigo: subpartidaRes.data.codigo, nombre: subpartidaRes.data.nombre }
          : null,
      };
    },
    enabled: !!conceptoId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando ruta TU...
      </div>
    );
  }

  if (!data || !data.departamento) {
    return (
      <div className="text-sm text-muted-foreground">
        Sin ruta TU asociada
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant="outline" className="font-normal">
        {data.departamento}
      </Badge>
      
      {data.mayor && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-normal">
            {data.mayor.codigo} - {data.mayor.nombre}
          </Badge>
        </>
      )}
      
      {data.partida && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="font-normal">
            {data.partida.codigo} - {data.partida.nombre}
          </Badge>
        </>
      )}
      
      {data.subpartida && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary" className="font-medium">
            {data.subpartida.codigo} - {data.subpartida.nombre}
          </Badge>
        </>
      )}
    </div>
  );
}
