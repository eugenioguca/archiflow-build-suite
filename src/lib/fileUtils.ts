import { supabase } from '@/integrations/supabase/client';

export interface FileUploadOptions {
  bucket: string;
  folder?: string;
  generatePublicUrl?: boolean;
}

export interface FileUrlResult {
  url: string;
  isPublic: boolean;
}

/**
 * Sube un archivo a Supabase Storage y retorna la información necesaria
 */
export const uploadFileToStorage = async (
  file: File, 
  options: FileUploadOptions
): Promise<{ filePath: string; publicUrl?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  let fileName: string;
  if (options.folder) {
    fileName = `${options.folder}/${user.id}/${timestamp}_${sanitizedFileName}`;
  } else {
    fileName = `${user.id}/${timestamp}_${sanitizedFileName}`;
  }

  // Subir archivo
  const { data, error: uploadError } = await supabase.storage
    .from(options.bucket)
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  let publicUrl: string | undefined;
  
  if (options.generatePublicUrl) {
    const { data: urlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(fileName);
    publicUrl = urlData.publicUrl;
  }

  return {
    filePath: fileName,
    publicUrl
  };
};

/**
 * Obtiene la URL correcta para un archivo, ya sea pública o firmada
 */
export const getFileUrl = async (
  filePath: string, 
  bucket: string,
  forcePublic: boolean = false
): Promise<FileUrlResult> => {
  // Si ya es una URL completa, devolverla tal como está
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return { url: filePath, isPublic: true };
  }

  // Intentar obtener URL pública primero (para buckets públicos)
  if (forcePublic) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return { url: data.publicUrl, isPublic: true };
  }

  // Para buckets privados, generar URL firmada
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600); // 1 hora de expiración

  if (error) {
    // Si falla, intentar URL pública como fallback
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return { url: publicData.publicUrl, isPublic: true };
  }

  return { url: data.signedUrl, isPublic: false };
};

/**
 * Descarga un archivo preservando su tipo original
 */
export const downloadFile = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al descargar el archivo');
    
    const blob = await response.blob();
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar el objeto URL después de un breve delay
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback al método tradicional
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Detecta el tipo de archivo basado en la extensión
 */
export const getFileType = (fileName: string): {
  type: 'image' | 'pdf' | 'document' | 'text' | 'other';
  extension: string;
} => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
    return { type: 'image', extension };
  }
  
  if (extension === 'pdf') {
    return { type: 'pdf', extension };
  }
  
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    return { type: 'document', extension };
  }
  
  if (['txt', 'csv', 'json', 'xml'].includes(extension)) {
    return { type: 'text', extension };
  }
  
  return { type: 'other', extension };
};

/**
 * Formatea el tamaño de archivo
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Path Builder para el sistema de documentos hereditarios
 */
export class PathBuilder {
  /**
   * Construye path para documentos de cliente (fase lead)
   */
  static buildClientPath(clientName: string, clientId: string, documentType: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedName = clientName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = this.getClientDocumentFolder(documentType);
    
    return `cliente_${sanitizedName}_${timestamp}/${folder}/${fileName}`;
  }

  /**
   * Construye path para documentos de proyecto
   */
  static buildProjectPath(projectId: string, department: string, fileName: string, isInherited: boolean = false): string {
    const folder = isInherited ? 'inherited' : department;
    const subfolder = isInherited ? this.getInheritedSubfolder(fileName) : '';
    
    return `proyecto_${projectId}/${folder}${subfolder ? '/' + subfolder : ''}/${fileName}`;
  }

  /**
   * Determina la carpeta según el tipo de documento de cliente
   */
  private static getClientDocumentFolder(documentType: string): string {
    const fiscalTypes = ['curp', 'rfc', 'constancia_fiscal', 'identificacion', 'cedula_fiscal'];
    return fiscalTypes.includes(documentType.toLowerCase()) ? 'fiscal' : 'legal';
  }

  /**
   * Determina la subcarpeta para documentos heredados
   */
  private static getInheritedSubfolder(fileName: string): string {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('curp') || lowerFileName.includes('rfc') || 
        lowerFileName.includes('fiscal') || lowerFileName.includes('identificacion')) {
      return 'fiscal';
    }
    return 'legal';
  }

  /**
   * Construye path para búsqueda de documentos por cliente
   */
  static buildClientSearchPattern(clientName: string): string {
    const sanitizedName = clientName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `cliente_${sanitizedName}_*`;
  }
}

/**
 * Funciones para manejo de herencia de documentos
 */

/**
 * Sube un documento de cliente al bucket unificado project-documents
 */
export const uploadClientDocument = async (
  file: File,
  clientId: string,
  clientName: string,
  documentType: string
): Promise<{ filePath: string; publicUrl?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = PathBuilder.buildClientPath(clientName, clientId, documentType, fileName);

  // Subir al bucket unificado project-documents
  const { data, error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Generar URL pública
  const { data: urlData } = supabase.storage
    .from('project-documents')
    .getPublicUrl(filePath);

  return { 
    filePath,
    publicUrl: urlData.publicUrl
  };
};

/**
 * Sube un documento de proyecto al bucket público
 */
export const uploadProjectDocument = async (
  file: File,
  projectId: string,
  department: string
): Promise<{ filePath: string; publicUrl?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = PathBuilder.buildProjectPath(projectId, department, fileName);

  // Subir al bucket público project-documents
  const { data, error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Generar URL pública
  const { data: urlData } = supabase.storage
    .from('project-documents')
    .getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: urlData.publicUrl
  };
};

/**
 * Lista documentos de cliente desde tabla unificada documents
 */
export const listClientDocuments = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .eq('document_status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing client documents:', error);
    return [];
  }
};