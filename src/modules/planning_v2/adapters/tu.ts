/**
 * Read-only adapter for TU (Transacciones Unificadas) dimensions
 * Provides safe access to chart of accounts without mutations
 */
import { supabase } from '@/integrations/supabase/client';

export interface DepartamentoAdapter {
  id: string;
  departamento: string;
  activo: boolean;
}

export interface MayorAdapter {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string;
  activo: boolean;
}

export interface PartidaAdapter {
  id: string;
  codigo: string;
  nombre: string;
  mayor_id: string;
  activo: boolean;
}

export interface SubpartidaAdapter {
  id: string;
  codigo: string;
  nombre: string;
  partida_id: string | null;
  es_global: boolean;
  departamento_aplicable: string | null;
  activo: boolean;
}

export const tuAdapter = {
  /**
   * Get all departamentos (read-only)
   */
  async getDepartamentos(): Promise<DepartamentoAdapter[]> {
    const { data, error } = await supabase
      .from('chart_of_accounts_departamentos')
      .select('id, departamento, activo')
      .eq('activo', true)
      .order('departamento');

    if (error) {
      console.error('Error fetching departamentos:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all mayores for a departamento (read-only)
   */
  async getMayores(departamento?: string): Promise<MayorAdapter[]> {
    let query = supabase
      .from('chart_of_accounts_mayor')
      .select('id, codigo, nombre, departamento, activo')
      .eq('activo', true);

    if (departamento) {
      query = query.eq('departamento', departamento);
    }

    const { data, error } = await query.order('codigo');

    if (error) {
      console.error('Error fetching mayores:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all partidas for a mayor (read-only)
   */
  async getPartidas(mayorId?: string): Promise<PartidaAdapter[]> {
    let query = supabase
      .from('chart_of_accounts_partidas')
      .select('id, codigo, nombre, mayor_id, activo')
      .eq('activo', true);

    if (mayorId) {
      query = query.eq('mayor_id', mayorId);
    }

    const { data, error } = await query.order('codigo');

    if (error) {
      console.error('Error fetching partidas:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all subpartidas (read-only)
   */
  async getSubpartidas(partidaId?: string): Promise<SubpartidaAdapter[]> {
    let query = supabase
      .from('chart_of_accounts_subpartidas')
      .select('id, codigo, nombre, partida_id, es_global, departamento_aplicable, activo')
      .eq('activo', true);

    if (partidaId) {
      query = query.eq('partida_id', partidaId);
    }

    const { data, error } = await query.order('codigo');

    if (error) {
      console.error('Error fetching subpartidas:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get subpartidas by partida with optional search query
   */
  async getSubpartidasByPartida(partidaId: string, searchQuery?: string): Promise<SubpartidaAdapter[]> {
    let query = supabase
      .from('chart_of_accounts_subpartidas')
      .select('id, codigo, nombre, partida_id, es_global, departamento_aplicable, activo')
      .eq('activo', true)
      .eq('partida_id', partidaId);

    if (searchQuery && searchQuery.trim()) {
      const search = `%${searchQuery.trim()}%`;
      query = query.or(`codigo.ilike.${search},nombre.ilike.${search}`);
    }

    const { data, error } = await query.order('codigo').limit(100);

    if (error) {
      console.error('Error fetching subpartidas by partida:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get full dimensions hierarchy (read-only)
   */
  async getDimensions() {
    const [departamentos, mayores, partidas, subpartidas] = await Promise.all([
      this.getDepartamentos(),
      this.getMayores(),
      this.getPartidas(),
      this.getSubpartidas()
    ]);

    return {
      departamentos,
      mayores,
      partidas,
      subpartidas
    };
  }
};
