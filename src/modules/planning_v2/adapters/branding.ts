/**
 * Branding adapter for Planning v2
 * Centralized branding data loading
 */
import { supabase } from '@/integrations/supabase/client';
import dovitaLogo from '@/assets/dovita-logo-white.png';

export interface CompanyBranding {
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  primary_color: string;
  secondary_color: string;
}

/**
 * Fetch company branding from database
 * Returns fallback values if not found
 */
export async function getBranding(): Promise<CompanyBranding> {
  try {
    const { data, error } = await supabase
      .from('company_branding')
      .select('company_name, logo_url, address, phone, email, website')
      .maybeSingle();

    if (error) {
      console.warn('Error loading company branding:', error);
    }

    return {
      company_name: data?.company_name || 'DOVITA CONSTRUCCIONES',
      logo_url: data?.logo_url || dovitaLogo,
      address: data?.address || 'Monterrey, Nuevo León',
      phone: data?.phone || 'Tel: +52 (55) 1234-5678',
      email: data?.email || 'info@dovita.com.mx',
      website: data?.website || null,
      primary_color: '#1e40af', // Blue from reference image
      secondary_color: '#f59e0b', // Orange accent from logo
    };
  } catch (error) {
    console.error('Error loading branding:', error);
    return {
      company_name: 'DOVITA CONSTRUCCIONES',
      logo_url: dovitaLogo,
      address: 'Monterrey, Nuevo León',
      phone: 'Tel: +52 (55) 1234-5678',
      email: 'info@dovita.com.mx',
      website: null,
      primary_color: '#1e40af',
      secondary_color: '#f59e0b',
    };
  }
}
