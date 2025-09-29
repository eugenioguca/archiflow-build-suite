/**
 * Read-only adapter for clients
 * Provides safe access to existing client data without mutations
 */
import { supabase } from '@/integrations/supabase/client';

export interface ClientAdapter {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export const clientsAdapter = {
  /**
   * Get client by ID (read-only)
   */
  async getById(clientId: string): Promise<ClientAdapter | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all clients (read-only)
   */
  async getAll(): Promise<ClientAdapter[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .order('full_name');

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    return data || [];
  }
};
