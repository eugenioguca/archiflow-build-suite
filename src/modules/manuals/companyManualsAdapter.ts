import { supabase } from "@/integrations/supabase/client";
import { openExternalDoc } from "@/lib/openExternalDoc";

const COMPANY_MANUALS_BUCKET = "operation-manuals";

/**
 * Obtiene el bucket donde se almacenan los manuales de empresa
 */
export function getCompanyManualBucket(): string {
  return COMPANY_MANUALS_BUCKET;
}

/**
 * Item de manual desde Storage
 */
export type ManualItem = {
  name: string;
  path: string;
  size?: number | null;
  category?: string | null;
  created_at?: string;
  updated_at?: string;
  id?: string;
};

/**
 * Lista todos los manuales del bucket de empresa
 * @param prefix - Prefijo para filtrar (default: "manuals/")
 * @returns Array de manuales disponibles
 */
export async function listCompanyManuals(prefix = "manuals/"): Promise<ManualItem[]> {
  const { data, error } = await supabase.storage
    .from(COMPANY_MANUALS_BUCKET)
    .list(prefix, { limit: 100 });
  
  if (error) {
    console.error("Error listing company manuals:", error);
    throw error;
  }
  
  return (data ?? [])
    .filter(x => !x.name.startsWith(".") && x.name !== "") // Ignora archivos ocultos y vacíos
    .map(x => ({
      name: x.name,
      path: `${prefix}${x.name}`,
      size: x.metadata?.size ?? null,
      category: "General",
      id: x.id,
      created_at: x.created_at,
      updated_at: x.updated_at,
    }));
}

/**
 * Crea una URL firmada para un manual
 * @param path - Path del archivo en el bucket
 * @param expiresIn - Tiempo de expiración en segundos (default: 600 = 10 minutos)
 * @returns URL firmada
 */
export async function signCompanyManual(path: string, expiresIn = 600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(COMPANY_MANUALS_BUCKET)
    .createSignedUrl(path, expiresIn);
  
  if (error || !data?.signedUrl) {
    console.error("Error signing company manual:", error);
    throw error ?? new Error("No se pudo crear la URL firmada");
  }
  
  return data.signedUrl;
}
