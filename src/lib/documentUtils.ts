import { supabase } from '@/integrations/supabase/client';

export interface DocumentSource {
  source: 'sales' | 'project' | 'project_field';
  bucket: string;
  isPublic: boolean;
}

/**
 * Determina el bucket correcto y su configuración basado en la fuente del documento
 */
export const getBucketForDocument = (source?: string): DocumentSource => {
  switch (source) {
    case 'sales':
      return {
        source: 'sales',
        bucket: 'client-documents',
        isPublic: false
      };
    case 'project':
      return {
        source: 'project',
        bucket: 'project-documents', 
        isPublic: true
      };
    case 'project_field':
      return {
        source: 'project_field',
        bucket: 'client-documents',
        isPublic: false
      };
    default:
      // Fallback: intentar detectar desde el path
      return {
        source: 'sales',
        bucket: 'client-documents',
        isPublic: false
      };
  }
};

/**
 * Detecta el bucket desde el file_path si es posible
 */
export const detectBucketFromPath = (filePath: string): DocumentSource => {
  // Si el path contiene indicadores de proyecto, usar bucket público
  if (filePath.includes('proyecto_') || filePath.includes('/design/') || filePath.includes('/construction/')) {
    return {
      source: 'project',
      bucket: 'project-documents',
      isPublic: true
    };
  }
  
  // Por defecto, asumir que es un documento de cliente (privado)
  return {
    source: 'sales',
    bucket: 'client-documents',
    isPublic: false
  };
};

/**
 * Normaliza el path del archivo para uso con Supabase Storage
 */
const normalizePath = (filePath: string, targetBucket: string): string => {
  console.log('normalizePath - Input:', { filePath, targetBucket });
  
  // Limpiar slashes iniciales y finales
  let normalizedPath = filePath.replace(/^\/+|\/+$/g, '');
  
  // Detectar si el path ya incluye un bucket
  const hasClientBucket = normalizedPath.startsWith('client-documents/');
  const hasProjectBucket = normalizedPath.startsWith('project-documents/');
  
  console.log('normalizePath - Bucket detection:', { hasClientBucket, hasProjectBucket });
  
  // Si el path ya incluye el bucket correcto, solo remover el prefijo
  if (hasClientBucket && targetBucket === 'client-documents') {
    normalizedPath = normalizedPath.substring('client-documents/'.length);
  } else if (hasProjectBucket && targetBucket === 'project-documents') {
    normalizedPath = normalizedPath.substring('project-documents/'.length);
  } else if (hasClientBucket && targetBucket === 'project-documents') {
    // Path tiene client-documents pero necesitamos project-documents
    normalizedPath = normalizedPath.substring('client-documents/'.length);
  } else if (hasProjectBucket && targetBucket === 'client-documents') {
    // Path tiene project-documents pero necesitamos client-documents  
    normalizedPath = normalizedPath.substring('project-documents/'.length);
  }
  
  // Limpiar duplicaciones que puedan haber quedado
  normalizedPath = normalizedPath
    .replace(/^client-documents\//, '')
    .replace(/^project-documents\//, '')
    .replace(/^\/+/, '');
  
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
      
      // Fallback 1: intentar con el bucket alternativo
      const fallbackBucket = bucketInfo.bucket === 'client-documents' ? 'project-documents' : 'client-documents';
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
      
      // Si falla el bucket primario, intentar con el otro bucket
      const fallbackBucket = bucketInfo.bucket === 'client-documents' ? 'project-documents' : 'client-documents';
      const fallbackNormalizedPath = normalizePath(filePath, fallbackBucket);
      
      console.log('downloadDocument - Trying fallback:', { fallbackBucket, fallbackNormalizedPath });
      
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from(fallbackBucket)
        .download(fallbackNormalizedPath);
      
      if (fallbackError) {
        throw new Error(`Error en ambos buckets: ${error.message} | ${fallbackError.message}`);
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