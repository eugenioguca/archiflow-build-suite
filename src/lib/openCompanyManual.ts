import { supabase } from "@/integrations/supabase/client";

// Centraliza bucket y TTL
const COMPANY_BUCKET = "operation-manuals";
const DEFAULT_TTL = 60 * 15; // 15 min

async function signPath(path: string, ttl = DEFAULT_TTL) {
  const { data, error } = await supabase
    .storage.from(COMPANY_BUCKET)
    .createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) throw error ?? new Error("No signed URL");
  return data.signedUrl;
}

export async function openCompanyManualPath(path: string, ttl = DEFAULT_TTL) {
  // 1) Abrimos la pestaña PRIMERO para evitar bloqueador
  const win = window.open("", "_blank", "noopener");
  if (!win) return; // pop-up bloqueado
  try {
    // 2) Firma just-in-time
    let url = await signPath(path, ttl);
    win.location.href = url;
  } catch (e: any) {
    // 3) Reintento si es JWT/exp (latencia o desfase)
    const msg = String(e?.message || e);
    if (msg.includes("JWT") || msg.includes("exp")) {
      try {
        const url = await signPath(path, ttl);
        win.location.href = url;
        return;
      } catch (e2) {
        try { win.close(); } catch {}
        throw e2;
      }
    }
    try { win.close(); } catch {}
    throw e;
  }
}
