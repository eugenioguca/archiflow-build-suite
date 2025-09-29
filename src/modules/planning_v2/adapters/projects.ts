/**
 * Read-only adapter for client_projects
 * Provides safe access to existing project data without mutations
 * Supports search and pagination for remote comboboxes
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProjectAdapter {
  id: string;
  project_name: string;
  client_id: string;
  status: string;
  created_at: string;
}

export interface SearchProjectsParams {
  q?: string;
  limit?: number;
  page?: number;
  clientId?: string;
}

export interface SearchProjectsResult {
  items: ProjectAdapter[];
  nextPage: number | null;
  totalCount: number;
}

export const projectsAdapter = {
  /**
   * Get project by ID (read-only)
   */
  async getById(projectId: string): Promise<ProjectAdapter | null> {
    try {
      const { data, error } = await supabase
        .from('planning_v2_projects_ro')
        .select('id, project_name, client_id, status, created_at')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  },

  /**
   * Get all active projects (read-only)
   */
  async getAll(): Promise<ProjectAdapter[]> {
    try {
      const { data, error } = await supabase
        .from('planning_v2_projects_ro')
        .select('id, project_name, client_id, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  /**
   * Search projects with pagination (for remote combobox)
   * @param params - Search parameters (q: query string, limit: results per page, page: page number, clientId: optional filter)
   * @returns Paginated search results
   */
  async search(params: SearchProjectsParams = {}): Promise<SearchProjectsResult> {
    const { q = '', limit = 20, page = 1, clientId } = params; // TU-style: 20 items/page
    
    // Sanitize search query
    const sanitizedQuery = q.trim().slice(0, 64);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      let query = supabase
        .from('planning_v2_projects_ro')
        .select('id, project_name, client_id, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (sanitizedQuery) {
        query = query.ilike('project_name', `%${sanitizedQuery}%`);
      }

      if (clientId) {
        query = query.eq('client_id', clientId);
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
      console.error('Error searching projects:', error);
      return { items: [], nextPage: null, totalCount: 0 };
    }
  }
};
