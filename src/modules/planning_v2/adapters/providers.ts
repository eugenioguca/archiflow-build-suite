/**
 * Providers adapter for Planning v2
 * Read-only access to suppliers catalog
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProviderAdapter {
  id: string;
  company_name: string;
  rfc?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

export const providersAdapter = {
  /**
   * Get all providers with optional search query (server-side search)
   */
  async getAllProviders(searchQuery?: string): Promise<ProviderAdapter[]> {
    let query = supabase
      .from('suppliers')
      .select('id, company_name, rfc, contact_name, phone, email')
      .order('company_name');

    if (searchQuery && searchQuery.trim()) {
      const search = `%${searchQuery.trim()}%`;
      query = query.or(`company_name.ilike.${search},rfc.ilike.${search}`);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching providers:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get a single provider by ID
   */
  async getProviderById(providerId: string): Promise<ProviderAdapter | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, company_name, rfc, contact_name, phone, email')
      .eq('id', providerId)
      .single();

    if (error) {
      console.error('Error fetching provider:', error);
      return null;
    }

    return data;
  }
};
