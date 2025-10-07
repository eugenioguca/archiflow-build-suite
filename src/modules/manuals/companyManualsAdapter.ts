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
 * Mapeo de tipos de manual a categorías en la DB
 */
const MANUAL_CATEGORIES = {
  operacion: "manual_operacion",
  presentacion: "presentacion_corporativa",
} as const;

/**
 * Obtiene el path del manual desde la base de datos
 * @param kind - Tipo de manual ('operacion' | 'presentacion')
 * @returns Path del archivo en el bucket o null si no existe
 */
export async function getCompanyManualPath(
  kind: "operacion" | "presentacion"
): Promise<string | null> {
  const category = MANUAL_CATEGORIES[kind];

  const { data, error } = await supabase
    .from("operation_manuals")
    .select("file_url")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.file_url) {
    console.error(`No se encontró manual de tipo ${kind}:`, error);
    return null;
  }

  // Extraer path relativo del bucket
  // file_url puede ser: https://...supabase.co/storage/v1/object/public/operation-manuals/manuals/123.pdf
  // o un path relativo como: manuals/123.pdf
  const url = data.file_url;
  
  if (url.includes("/operation-manuals/")) {
    // Extraer el path después del bucket
    const parts = url.split("/operation-manuals/");
    return parts[1] || null;
  }
  
  // Si ya es un path relativo
  return url.startsWith("/") ? url.substring(1) : url;
}

/**
 * Crea una URL firmada para un manual de empresa
 * @param kind - Tipo de manual ('operacion' | 'presentacion')
 * @param expiresIn - Tiempo de expiración en segundos (default: 600 = 10 minutos)
 * @returns URL firmada
 */
export async function createCompanyManualSignedUrl(
  kind: "operacion" | "presentacion",
  expiresIn: number = 600
): Promise<string> {
  const path = await getCompanyManualPath(kind);
  
  if (!path) {
    throw new Error(`No se encontró el manual de ${kind}`);
  }

  const { data, error } = await supabase.storage
    .from(COMPANY_MANUALS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("No se pudo crear la URL firmada");
  }

  return data.signedUrl;
}

/**
 * Abre un manual de empresa en una nueva pestaña
 * @param kind - Tipo de manual ('operacion' | 'presentacion')
 */
export async function openCompanyManual(
  kind: "operacion" | "presentacion"
): Promise<void> {
  const bucket = getCompanyManualBucket();
  const path = await getCompanyManualPath(kind);
  
  if (!path) {
    throw new Error(`No se encontró el manual de ${kind}`);
  }

  return openExternalDoc({
    type: "signed",
    bucket,
    path,
    expiresIn: 600,
  });
}
