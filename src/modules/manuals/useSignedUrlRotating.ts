import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSignedUrlRotatingParams {
  bucket: string;
  path: string;
  ttlSec?: number;
  refreshSec?: number;
}

interface UseSignedUrlRotatingReturn {
  url: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useSignedUrlRotating({
  bucket,
  path,
  ttlSec = 900, // 15 min default
  refreshSec,
}: UseSignedUrlRotatingParams): UseSignedUrlRotatingReturn {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calculate refresh interval (default 80% of TTL)
  const refreshInterval = refreshSec ? refreshSec * 1000 : ttlSec * 0.8 * 1000;

  const signUrl = useCallback(async (retryOnJwtError = true): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, ttlSec);

      if (signError || !data?.signedUrl) {
        throw signError || new Error('No se pudo crear la URL firmada');
      }

      setUrl(data.signedUrl);
      setLoading(false);
    } catch (e: any) {
      const errorMsg = String(e?.message || e);
      
      // Retry once if JWT/exp error
      if (retryOnJwtError && (errorMsg.includes('JWT') || errorMsg.includes('exp'))) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          return await signUrl(false);
        } catch (retryError: any) {
          setError(retryError);
          setLoading(false);
          return;
        }
      }
      
      setError(e);
      setLoading(false);
    }
  }, [bucket, path, ttlSec]);

  const refresh = useCallback(async () => {
    await signUrl();
  }, [signUrl]);

  useEffect(() => {
    // Initial sign
    signUrl();

    // Setup auto-refresh
    intervalRef.current = setInterval(() => {
      signUrl();
    }, refreshInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [signUrl, refreshInterval]);

  return { url, loading, error, refresh };
}
