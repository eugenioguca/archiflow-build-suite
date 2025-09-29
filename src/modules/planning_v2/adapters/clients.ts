/**
 * Read-only adapter for clients
 * Provides safe access to existing client data without mutations
 * Supports search and pagination for remote comboboxes
 */
import { supabase } from '@/integrations/supabase/client';

export interface ClientAdapter {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export interface SearchClientsParams {
  q?: string;
  limit?: number;
  page?: number;
}

export interface SearchClientsResult {
  items: ClientAdapter[];
  nextPage: number | null;
  totalCount: number;
}

export const clientsAdapter = {
  /**
   * Get client by ID (read-only)
   */
  async getById(clientId: string): Promise<ClientAdapter | null> {
    try {
      const { data, error } = await supabase
        .from('planning_v2_clients_ro')
        .select('id, full_name, email, phone')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching client:', error);
      return null;
    }
  },

  /**
   * Get all clients (read-only)
   */
  async getAll(): Promise<ClientAdapter[]> {
    try {
      const { data, error } = await supabase
        .from('planning_v2_clients_ro')
        .select('id, full_name, email, phone')
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  },

  /**
   * Search clients with pagination (for remote combobox)
   * @param params - Search parameters (q: query string, limit: results per page, page: page number)
   * @returns Paginated search results
   */
  async search(params: SearchClientsParams = {}): Promise<SearchClientsResult> {
    const { q = '', limit = 20, page = 1 } = params; // TU-style: 20 items/page
    
    // Sanitize search query
    const sanitizedQuery = q.trim().slice(0, 64);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      let query = supabase
        .from('planning_v2_clients_ro')
        .select('id, full_name, email, phone', { count: 'exact' })
        .order('full_name')
        .range(from, to);

      if (sanitizedQuery) {
        query = query.ilike('full_name', `%${sanitizedQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const totalCount = count || 0;
      const hasMore = totalCount > to + 1;

      return {
        items: data || [],
        nextPage: hasMore ? page + 1 : null,
        totalCount,
      };
    } catch (error) {
      console.error('Error searching clients:', error);
      return { items: [], nextPage: null, totalCount: 0 };
    }
  }
};
