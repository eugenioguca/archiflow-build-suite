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
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSignedUrlRotating({
  bucket,
  path,
  ttlSec = 900, // 15 min default
  refreshSec,
}: UseSignedUrlRotatingParams): UseSignedUrlRotatingReturn {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const signUrl = useCallback(async (): Promise<void> => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(pathRef.current, ttlSec);

      if (signError || !data?.signedUrl) {
        throw signError || new Error('No se pudo crear la URL firmada');
      }

      setUrl(data.signedUrl);
    } catch (e: any) {
      const errorMsg = String(e?.message || e);
      
      // Log error details (without secrets)
      console.warn('[useSignedUrlRotating] Error signing URL:', {
        bucket,
        path: pathRef.current,
        error: errorMsg,
        ttlSec
      });
      
      // Retry once if JWT/exp error
      if (/InvalidJWT|exp/i.test(errorMsg)) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data, error: signError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(pathRef.current, ttlSec);
          
          if (signError || !data?.signedUrl) {
            throw signError || new Error('No se pudo crear la URL firmada');
          }
          
          setUrl(data.signedUrl);
          setError(null);
        } catch (retryError: any) {
          const retryMsg = String(retryError?.message || retryError);
          console.warn('[useSignedUrlRotating] Retry failed:', {
            bucket,
            path: pathRef.current,
            error: retryMsg
          });
          setError(retryMsg);
          setUrl(null);
        }
      } else {
        setError(errorMsg);
        setUrl(null);
      }
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [bucket, ttlSec]);

  const refresh = useCallback(async () => {
    await signUrl();
  }, [signUrl]);

  useEffect(() => {
    // Initial sign
    signUrl();

    // Calculate refresh interval (default 80% of TTL, minimum 60 seconds)
    const interval = refreshSec ?? Math.max(60, Math.floor(ttlSec * 0.8));
    
    // Setup auto-refresh
    intervalRef.current = window.setInterval(() => {
      signUrl();
    }, interval * 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [signUrl, ttlSec, refreshSec]);

  return { url, loading, error, refresh };
}
