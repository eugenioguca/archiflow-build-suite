import { supabase } from '@/integrations/supabase/client';

export interface DocumentSource {
  source: 'sales' | 'project' | 'project_field';
  bucket: string;
  isPublic: boolean;
}

/**
 * Determina el bucket correcto y su configuración basado en la fuente del documento
 * ACTUALIZADO: Todo ahora va al bucket unificado project-documents
 */
export const getBucketForDocument = (source?: string): DocumentSource => {
  // Sistema unificado: todos los documentos van al bucket project-documents
  return {
    source: 'project',
    bucket: 'project-documents',
    isPublic: true
  };
};

/**
 * Detecta el bucket desde el file_path si es posible
 * ACTUALIZADO: Sistema unificado siempre usa project-documents
 */
export const detectBucketFromPath = (filePath: string): DocumentSource => {
  // Sistema unificado: todos los documentos van al bucket project-documents
  return {
    source: 'project',
    bucket: 'project-documents',
    isPublic: true
  };
};

/**
 * Normaliza el path del archivo para uso con Supabase Storage
 */
const normalizePath = (filePath: string, targetBucket: string): string => {
  console.log('normalizePath - Input:', { filePath, targetBucket });
  
  // Limpiar slashes iniciales y finales
  let normalizedPath = filePath.replace(/^\/+|\/+$/g, '');
  
  // Si el path ya incluye el bucket correcto, usarlo como está sin normalización adicional
  if (normalizedPath.includes(`${targetBucket}/`)) {
    console.log('normalizePath - Path already contains target bucket, using as is');
    return normalizedPath;
  }
  
  // Detectar si el path ya incluye el bucket correcto (project-documents)
  const hasProjectBucket = normalizedPath.startsWith('project-documents/');
  
  console.log('normalizePath - Bucket detection:', { hasProjectBucket });
  
  // Si el path ya incluye el bucket, remover el prefijo para evitar duplicación
  if (hasProjectBucket) {
    normalizedPath = normalizedPath.substring('project-documents/'.length);
  }
  
  console.log('normalizePath - Output:', normalizedPath);
  return normalizedPath;
};

/**
 * Genera la URL correcta para visualizar un documento
 */
export const getDocumentViewUrl = async (
  filePath: string, 
  source?: string
): Promise<{ url: string; isSignedUrl: boolean; error?: string }> => {
  try {
    console.log('getDocumentViewUrl - Input:', { filePath, source });
    
    // Si ya es una URL completa, usarla directamente
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return { url: filePath, isSignedUrl: false };
    }

    // Determinar bucket y configuración primero
    const bucketInfo = source ? getBucketForDocument(source) : detectBucketFromPath(filePath);
    console.log('getDocumentViewUrl - Bucket info:', bucketInfo);
    
    // Normalizar el path con el bucket objetivo
    const normalizedPath = normalizePath(filePath, bucketInfo.bucket);
    console.log('getDocumentViewUrl - Normalized path:', normalizedPath);

    
    // Para buckets públicos, usar URL pública
    if (bucketInfo.isPublic) {
      const { data } = supabase.storage
        .from(bucketInfo.bucket)
        .getPublicUrl(normalizedPath);
      
      console.log('getDocumentViewUrl - Public URL generated:', data.publicUrl);
      return { url: data.publicUrl, isSignedUrl: false };
    }

    // Para buckets privados, generar URL firmada
    const { data, error } = await supabase.storage
      .from(bucketInfo.bucket)
      .createSignedUrl(normalizedPath, 3600); // 1 hora de expiración

    if (error) {
      console.error('Error creating signed URL:', error);
      
      // Fallback 1: intentar con el bucket unificado project-documents
      const fallbackBucket = 'project-documents';
      const fallbackNormalizedPath = normalizePath(filePath, fallbackBucket);
      
      console.log('getDocumentViewUrl - Trying fallback bucket:', { fallbackBucket, fallbackNormalizedPath });
      
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from(fallbackBucket)
        .createSignedUrl(fallbackNormalizedPath, 3600);
      
      if (!fallbackError && fallbackData) {
        console.log('getDocumentViewUrl - Fallback signed URL generated:', fallbackData.signedUrl);
        return { url: fallbackData.signedUrl, isSignedUrl: true };
      }
      
      // Fallback 2: intentar con URL pública del bucket original
      const { data: publicData } = supabase.storage
        .from(bucketInfo.bucket)
        .getPublicUrl(normalizedPath);
      
      console.log('getDocumentViewUrl - Final fallback public URL:', publicData.publicUrl);
      return { 
        url: publicData.publicUrl, 
        isSignedUrl: false,
        error: `URLs firmadas fallaron, usando URL pública: ${error.message}`
      };
    }

    console.log('getDocumentViewUrl - Signed URL generated:', data.signedUrl);
    return { url: data.signedUrl, isSignedUrl: true };
  } catch (error) {
    console.error('Error getting document URL:', error);
    return { 
      url: '', 
      isSignedUrl: false, 
      error: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}`
    };
  }
};

/**
 * Descarga un documento desde cualquier bucket
 */
export const downloadDocument = async (
  filePath: string,
  fileName: string,
  source?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Si ya es una URL completa, descargar directamente
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error('Error al obtener el archivo');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    }

    // Determinar bucket y normalizar path
    const bucketInfo = source ? getBucketForDocument(source) : detectBucketFromPath(filePath);
    const normalizedPath = normalizePath(filePath, bucketInfo.bucket);
    
    console.log('downloadDocument - Attempting download:', { bucketInfo, normalizedPath });
    
    // Intentar descarga directa desde Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketInfo.bucket)
      .download(normalizedPath);

    if (error) {
      console.error('downloadDocument - Primary bucket failed:', error);
      
      // Si falla, intentar path alternativo en el mismo bucket
      console.log('downloadDocument - Primary path failed, trying alternative path patterns');
      
      // Try alternative path interpretations
      const altPaths = [
        filePath.replace(/^[^\/]*\//, ''), // Remove first path segment
        filePath.split('/').slice(-1)[0], // Get just filename
        filePath.replace(/^\/+/, '') // Remove leading slashes only
      ];
      
      let fallbackData = null;
      for (const altPath of altPaths) {
        try {
          const { data, error: altError } = await supabase.storage
            .from(bucketInfo.bucket)
            .download(altPath);
          if (!altError && data) {
            fallbackData = data;
            console.log('downloadDocument - Success with alternative path:', altPath);
            break;
          }
        } catch (altError) {
          console.log('downloadDocument - Alternative path failed:', altPath, altError);
        }
      }
      
      if (!fallbackData) {
        throw new Error(`Error downloading from bucket ${bucketInfo.bucket}: ${error.message}`);
      }
      
      // Usar datos del fallback
      const url = URL.createObjectURL(fallbackData);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    }

    // Descargar archivo exitosamente
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading document:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Cache simple para URLs firmadas para evitar regeneración constante
 */
class UrlCache {
  private cache = new Map<string, { url: string; expiry: number; isSignedUrl: boolean }>();
  private readonly CACHE_DURATION = 3000000; // 50 minutos (menos que la expiración de 1 hora)

  get(key: string): { url: string; isSignedUrl: boolean } | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return { url: cached.url, isSignedUrl: cached.isSignedUrl };
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, url: string, isSignedUrl: boolean): void {
    this.cache.set(key, {
      url,
      isSignedUrl,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const urlCache = new UrlCache();

/**
 * Obtiene URL con cache para evitar regeneración constante
 */
/**
 * Abre un documento en una nueva pestaña con fallbacks robustos
 */
export const openDocumentInNewTab = async (
  filePath: string,
  source?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('openDocumentInNewTab - Starting with:', { filePath, source });
    
    // Helper function for intelligent tab opening detection
    const openWithDetection = (url: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const beforeOpen = Date.now();
        const originalFocus = document.hasFocus();
        
        // Attempt to open in new tab
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        
        // If we get a window reference, it's definitely successful
        if (newWindow && !newWindow.closed) {
          resolve(true);
          return;
        }
        
        // For cases where window.open returns null but might have opened
        // Use a combination of timing and focus detection
        const focusHandler = () => {
          // If we lost focus quickly after opening, likely successful
          if (originalFocus && !document.hasFocus()) {
            cleanup();
            resolve(true);
          }
        };
        
        const cleanup = () => {
          window.removeEventListener('blur', focusHandler);
          clearTimeout(timeout);
        };
        
        // Listen for focus loss (indicates new tab opened)
        window.addEventListener('blur', focusHandler);
        
        // Timeout fallback - if no clear indication in 1 second, assume failure
        const timeout = setTimeout(() => {
          cleanup();
          // Check if we lost focus during this time
          const focusLost = originalFocus && !document.hasFocus();
          resolve(focusLost);
        }, 1000);
      });
    };
    
    // Si ya es una URL completa, abrirla directamente
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const success = await openWithDetection(filePath);
      return success 
        ? { success: true }
        : { success: false, error: 'No se pudo abrir el documento en nueva pestaña' };
    }

    // Intentar múltiples opciones de URL en orden de preferencia
    const fallbackOptions = [
      // Opción 1: URL usando lógica estándar
      async () => {
        const result = await getDocumentViewUrl(filePath, source);
        return result.url ? { url: result.url, source: 'standard' } : null;
      },
      
      // Opción 2: Intentar con signed URL en project-documents  
      async () => {
        try {
          const { data } = await supabase.storage
            .from('project-documents')
            .createSignedUrl(filePath.replace(/^\/+/, ''), 3600);
          return data?.signedUrl ? { url: data.signedUrl, source: 'signed-project' } : null;
        } catch {
          return null;
        }
      },
      
      // Opción 3: Intentar con path directo sin bucket en project-documents  
      async () => {
        try {
          const { data } = supabase.storage
            .from('project-documents')
            .getPublicUrl(filePath.replace(/^\/+/, ''));
          return data?.publicUrl ? { url: data.publicUrl, source: 'direct-project' } : null;
        } catch {
          return null;
        }
      },
      
      // Opción 4: Fallback final con path alternativo en project-documents
      async () => {
        try {
          // Try with different path patterns in case there's a path mismatch
          const altPath = filePath.includes('/') ? filePath.split('/').slice(-1)[0] : filePath;
          const { data } = supabase.storage
            .from('project-documents')
            .getPublicUrl(altPath.replace(/^\/+/, ''));
          return data?.publicUrl ? { url: data.publicUrl, source: 'alt-path-fallback' } : null;
        } catch {
          return null;
        }
      }
    ];

    // Intentar cada opción hasta que una funcione
    for (const [index, option] of fallbackOptions.entries()) {
      try {
        const result = await option();
        if (result?.url) {
          console.log(`openDocumentInNewTab - Success with option ${index + 1} (${result.source}):`, result.url);
          const success = await openWithDetection(result.url);
          if (success) {
            return { success: true };
          }
        }
      } catch (error) {
        console.warn(`openDocumentInNewTab - Option ${index + 1} failed:`, error);
      }
    }

    return { success: false, error: 'No se pudo generar ninguna URL válida para el documento' };
  } catch (error) {
    console.error('openDocumentInNewTab - Fatal error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

export const getCachedDocumentUrl = async (
  filePath: string,
  source?: string
): Promise<{ url: string; isSignedUrl: boolean; error?: string }> => {
  const cacheKey = `${filePath}-${source || 'auto'}`;
  
  // Verificar cache primero
  const cached = urlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Generar nueva URL
  const result = await getDocumentViewUrl(filePath, source);
  
  // Cachear solo si fue exitoso
  if (result.url && !result.error) {
    urlCache.set(cacheKey, result.url, result.isSignedUrl);
  }
  
  return result;
};