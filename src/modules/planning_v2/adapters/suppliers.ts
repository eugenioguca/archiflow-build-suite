/**
 * Suppliers adapter for Planning v2
 * Read-only access to suppliers catalog (shared with TU module)
 */
import { supabase } from '@/integrations/supabase/client';

export interface SupplierAdapter {
  id: string;
  company_name: string;
  rfc?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

export const suppliersAdapter = {
  /**
   * Get suppliers with optional search query
   */
  async getSuppliers(searchQuery?: string): Promise<SupplierAdapter[]> {
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
      console.error('Error fetching suppliers:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get a single supplier by ID
   */
  async getSupplierById(supplierId: string): Promise<SupplierAdapter | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, company_name, rfc, contact_name, phone, email')
      .eq('id', supplierId)
      .single();

    if (error) {
      console.error('Error fetching supplier:', error);
      return null;
    }

    return data;
  }
};
