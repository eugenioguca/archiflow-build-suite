import { supabase } from "@/integrations/supabase/client";

type OpenDocOptions =
  | { type: "signed"; bucket: string; path: string; expiresIn?: number } // Supabase Storage
  | { type: "url"; href: string };                                      // URL directa

export async function openExternalDoc(opts: OpenDocOptions) {
  // Abre pestaña inmediatamente para evitar popup blockers
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return; // bloqueado por el navegador

  try {
    if (opts.type === "url") {
      win.location.href = opts.href;
      return;
    }
    // Firmado Supabase Storage
    const { bucket, path, expiresIn = 60 * 10 } = opts;
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) throw error ?? new Error("No signed URL");
    // Navegar a la URL firmada (inline). No usar ?download para ver en navegador
    win.location.href = data.signedUrl;
  } catch (_e) {
    // Si falla, cierra la pestaña que abrimos
    try { win.close(); } catch {}
    throw _e;
  }
}
