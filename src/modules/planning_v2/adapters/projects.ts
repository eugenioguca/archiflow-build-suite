/**
 * Read-only adapter for client_projects
 * Provides safe access to existing project data without mutations
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProjectAdapter {
  id: string;
  project_name: string;
  client_id: string;
  status: string;
  created_at: string;
}

export const projectsAdapter = {
  /**
   * Get project by ID (read-only)
   */
  async getById(projectId: string): Promise<ProjectAdapter | null> {
    const { data, error } = await supabase
      .from('client_projects')
      .select('id, project_name, client_id, status, created_at')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all active projects (read-only)
   */
  async getAll(): Promise<ProjectAdapter[]> {
    const { data, error } = await supabase
      .from('client_projects')
      .select('id, project_name, client_id, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return [];
    }

    return data || [];
  }
};
