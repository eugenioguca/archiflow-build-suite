import { useEffect, useState, useCallback } from "react";
import { createCompanyManualSignedUrl } from "./companyManualsAdapter";

type ManualKind = "operacion" | "presentacion";

export function useCompanyManualUrl(kind: ManualKind, ttlSeconds = 600) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const signedUrl = await createCompanyManualSignedUrl(kind, ttlSeconds);
      setUrl(signedUrl);
    } catch (err) {
      console.error("Error fetching company manual URL:", err);
      setError("No se pudo generar el enlace del manual");
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }, [kind, ttlSeconds]);

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  return { url, loading, error, refresh: fetchUrl };
}
