import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  User,
  FileIcon,
  Image,
  FileSpreadsheet,
  File
} from 'lucide-react';

interface ProjectDocument {
  id: string;
  name: string;
  file_path: string;
  file_type?: string | null;
  file_size?: number | null;
  description?: string | null;
  created_at: string;
  uploader_name?: string | null;
  category?: string;
}

interface DocumentsPanelProps {
  documents: ProjectDocument[];
  onDocumentView?: (document: ProjectDocument) => void;
  onDocumentDownload?: (document: ProjectDocument) => void;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ 
  documents,
  onDocumentView,
  onDocumentDownload
}) => {
  const isMobile = useIsMobile();
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return File;
    
    const lowerType = fileType.toLowerCase();
    if (lowerType.includes('image') || lowerType.includes('jpg') || lowerType.includes('png')) {
      return Image;
    }
    if (lowerType.includes('pdf')) {
      return FileText;
    }
    if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || lowerType.includes('csv')) {
      return FileSpreadsheet;
    }
    return FileIcon;
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'contract': 'bg-blue-500/10 text-blue-700 border-blue-200',
      'permit': 'bg-green-500/10 text-green-700 border-green-200',
      'design': 'bg-purple-500/10 text-purple-700 border-purple-200',
      'financial': 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
      'construction': 'bg-orange-500/10 text-orange-700 border-orange-200',
      'legal': 'bg-red-500/10 text-red-700 border-red-200',
    };
    return colors[category || ''] || 'bg-gray-500/10 text-gray-700 border-gray-200';
  };

  // Agrupar documentos por categoría
  const groupedDocuments = documents.reduce((groups, doc) => {
    const category = doc.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(doc);
    return groups;
  }, {} as Record<string, ProjectDocument[]>);

  return (
    <Card className="h-full">
      <CardHeader className={isMobile ? 'p-4' : undefined}>
        <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : ''}`}>
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className={isMobile ? 'text-sm' : ''}>Documentos del Proyecto</span>
          </span>
          <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>{documents.length} archivos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className={isMobile ? 'p-4 pt-0' : undefined}>
        {documents.length === 0 ? (
          <div className={`text-center py-8 text-muted-foreground ${isMobile ? 'py-6' : ''}`}>
            <FileText className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 text-muted-foreground/50`} />
            <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>No hay documentos disponibles</p>
            <p className={`text-sm ${isMobile ? 'text-xs' : ''}`}>Los documentos del proyecto aparecerán aquí</p>
          </div>
        ) : (
          <div className={`space-y-6 ${isMobile ? 'space-y-4' : ''}`}>
            {Object.entries(groupedDocuments).map(([category, categoryDocs]) => (
              <div key={category} className={`space-y-3 ${isMobile ? 'space-y-2' : ''}`}>
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold capitalize ${isMobile ? 'text-sm' : ''}`}>{category}</h3>
                  <Badge variant="outline" className="text-xs">
                    {categoryDocs.length}
                  </Badge>
                </div>
                
                <div className={`grid gap-3 ${isMobile ? 'gap-2' : ''}`}>
                  {categoryDocs.map((doc) => {
                    const FileIconComponent = getFileIcon(doc.file_type);
                    
                    return (
                      <div 
                        key={doc.id} 
                        className={`${isMobile ? 'flex flex-col space-y-2 p-3' : 'flex items-center justify-between p-4'} border rounded-lg hover:shadow-md transition-shadow bg-card group`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                            <FileIconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium truncate ${isMobile ? 'text-sm' : ''}`}>{doc.name}</p>
                            {doc.description && (
                              <p className={`text-sm text-muted-foreground truncate ${isMobile ? 'text-xs' : ''}`}>{doc.description}</p>
                            )}
                            <div className={`flex items-center gap-2 text-xs text-muted-foreground mt-1 ${isMobile ? 'flex-wrap' : ''}`}>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(doc.created_at)}
                              </div>
                              {doc.uploader_name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className={isMobile ? 'truncate max-w-20' : ''}>{doc.uploader_name}</span>
                                </div>
                              )}
                              {doc.file_size && (
                                <span>{formatFileSize(doc.file_size)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? 'justify-between w-full' : ''}`}>
                          {doc.category && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(doc.category)}`}
                            >
                              {doc.category}
                            </Badge>
                          )}
                          
                          <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onDocumentView?.(doc)}
                              className={`${isMobile ? 'h-9 px-3' : 'h-8 w-8 p-0'}`}
                            >
                              <Eye className="h-4 w-4" />
                              {isMobile && <span className="ml-1 text-xs">Ver</span>}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onDocumentDownload?.(doc)}
                              className={`${isMobile ? 'h-9 px-3' : 'h-8 w-8 p-0'}`}
                            >
                              <Download className="h-4 w-4" />
                              {isMobile && <span className="ml-1 text-xs">Descargar</span>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};